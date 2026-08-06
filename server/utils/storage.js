import { createReadStream, existsSync } from 'node:fs'
import { mkdir, writeFile, access } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { Client } from 'minio'

const PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url))

let _minio = null

export function buildObjectPath(instansiKode, date, fileId, ext) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const safeExt = ext && ext.startsWith('.') ? ext : ext ? `.${ext}` : ''
  return `${String(instansiKode || 'GENERAL').toUpperCase()}/${year}/${month}/${fileId}${safeExt}`
}

let settingsOverlay = null

/** Called after Pengaturan → Integrasi save */
export function setStorageSettingsOverlay(partial) {
  settingsOverlay = partial
  _minio = null
}

export function getStorageConfig() {
  const config = useRuntimeConfig()
  const o = settingsOverlay || {}

  const driverRaw = o.storage_driver || config.storage?.driver || 'local'
  const driver = String(driverRaw).toLowerCase() === 'minio' ? 'minio' : 'local'
  const uploadDir = o.upload_dir || config.storage?.uploadDir || join(PROJECT_ROOT, 'uploads', 'surat')
  const root = isAbsolute(uploadDir) ? uploadDir : resolve(PROJECT_ROOT, uploadDir)

  // Bersihkan endpoint: strip protocol prefix
  let rawEndpoint = o.minio_endpoint || config.minio.endpoint
  rawEndpoint = String(rawEndpoint || '').replace(/^https?:\/\//, '')
  let useSSL = String(o.minio_use_ssl ?? config.minio.useSSL) === 'true'

  return {
    driver,
    uploadDir: root,
    minio: {
      endpoint: rawEndpoint || config.minio.endpoint,
      port: Number(o.minio_port || config.minio.port || 9000),
      useSSL,
      accessKey: o.minio_access_key || config.minio.accessKey,
      secretKey: o.minio_secret_key || config.minio.secretKey,
      bucket: o.minio_bucket || config.minio.bucket,
    },
  }
}

export function useMinioClient() {
  if (_minio) return _minio
  const { minio } = getStorageConfig()
  _minio = new Client({
    endPoint: minio.endpoint,
    port: minio.port,
    useSSL: minio.useSSL,
    accessKey: minio.accessKey,
    secretKey: minio.secretKey,
  })
  return _minio
}

/** Buat MinIO client dari .env — digunakan sebagai fallback saat DB overlay gagal */
function useEnvMinioClient() {
  const config = useRuntimeConfig()
  return new Client({
    endPoint: String(config.minio?.endpoint || '').replace(/^https?:\/\//, ''),
    port: Number(config.minio?.port || 9000),
    useSSL: String(config.minio?.useSSL) === 'true',
    accessKey: config.minio?.accessKey || '',
    secretKey: config.minio?.secretKey || '',
  })
}

async function ensureMinioBucket() {
  const { minio } = getStorageConfig()
  const client = useMinioClient()
  const exists = await client.bucketExists(minio.bucket)
  if (!exists) await client.makeBucket(minio.bucket)
  return minio.bucket
}

/** Coba operasi MinIO, fallback ke .env jika auth error */
async function withMinioFallback(fn, fallbackFn) {
  // 1. Coba dengan DB overlay
  try {
    const { minio } = getStorageConfig()
    return await fn(useMinioClient(), minio.bucket, minio)
  }
  catch (err) {
    const msg = err?.message || ''
    const isAuthErr = msg.includes('Access Key') || msg.includes('InvalidAccessKeyId')
      || msg.includes('The request signature') || msg.includes('SignatureDoesNotMatch')
    if (!isAuthErr) throw err
  }

  // 2. Fallback ke .env
  const config = useRuntimeConfig()
  const envEndpoint = String(config.minio?.endpoint || '').replace(/^https?:\/\//, '')
  if (!envEndpoint) throw createError({ statusCode: 502, statusMessage: 'MinIO auth failed and no .env fallback' })

  const client = useEnvMinioClient()
  const bucket = config.minio?.bucket || 'mailog'

  // Jika ada fallbackFn, gunakan itu; jika tidak, ulangi fn dengan env client
  if (fallbackFn) {
    return await fallbackFn(client, bucket)
  }
  return await fn(client, bucket)
}

/** Prevent path traversal outside upload root */
function safeJoin(root, objectPath) {
  const normalized = normalize(String(objectPath || '').replace(/^[/\\]+/, ''))
  const full = resolve(root, normalized)
  const rootWithSep = root.endsWith(sep) ? root : root + sep
  if (full !== root && !full.startsWith(rootWithSep)) {
    throw createError({ statusCode: 400, statusMessage: 'Path file tidak valid' })
  }
  return full
}

function candidateLocalPaths(root, objectPath) {
  const paths = []
  try {
    paths.push(safeJoin(root, objectPath))
  }
  catch {
    // ignore invalid join for legacy odd paths
  }
  const base = basename(objectPath)
  if (base && base !== objectPath) {
    paths.push(join(root, base))
  }
  // strip known prefixes from migrated MinIO keys
  const stripped = String(objectPath).replace(/^[^/]+\/legacy\//, '')
  if (stripped && stripped !== objectPath && stripped !== base) {
    paths.push(join(root, basename(stripped)))
  }
  return [...new Set(paths)]
}

async function findLocalFile(objectPath) {
  const { uploadDir } = getStorageConfig()
  for (const p of candidateLocalPaths(uploadDir, objectPath)) {
    try {
      await access(p)
      return p
    }
    catch {
      // continue
    }
  }
  return null
}

/**
 * Save a buffer to configured storage. Returns the object path to store in DB.
 */
export async function saveFile({ buffer, namaFile, mimeType, instansiKode = 'GENERAL' }) {
  const fileId = randomUUID()
  const ext = extname(namaFile || '') || guessExt(mimeType)
  const objectPath = buildObjectPath(instansiKode, new Date(), fileId, ext)
  const { driver, uploadDir, minio } = getStorageConfig()

  if (driver === 'minio') {
    try {
      const client = useMinioClient()
      const bucket = await ensureMinioBucket()
      await client.putObject(bucket, objectPath, buffer, buffer.length, {
        'Content-Type': mimeType || 'application/octet-stream',
      })
      return { path: objectPath, driver: 'minio', size: buffer.length }
    }
    catch (err) {
      console.warn('[storage] MinIO upload failed, falling back to local:', err?.message || err)
    }
  }

  const full = safeJoin(uploadDir, objectPath)
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, buffer)
  return { path: objectPath, driver: 'local', size: buffer.length }
}

/**
 * Open a readable stream for an object path (MinIO with .env fallback, then local).
 */
export async function openFileStream(objectPath) {
  const { driver, minio } = getStorageConfig()

  if (driver === 'minio') {
    try {
      return await withMinioFallback(
        async (client, bucket) => {
          // 1. Coba path persis dari DB
          try {
            const stream = await client.getObject(bucket, objectPath)
            return { stream, source: 'minio' }
          }
          catch (err) {
            if (err?.statusCode !== 404 && err?.code !== 'NoSuchKey') throw err
          }
          // 2. Fallback: coba basename di root bucket (kasus file ada di root tanpa folder)
          const base = basename(objectPath)
          if (base && base !== objectPath) {
            const stream = await client.getObject(bucket, base)
            return { stream, source: 'minio-root-fallback' }
          }
          throw new Error('NoSuchKey')
        },
        async (client, bucket) => {
          try {
            const stream = await client.getObject(bucket, objectPath)
            return { stream, source: 'minio-env' }
          }
          catch (err) {
            if (err?.statusCode !== 404 && err?.code !== 'NoSuchKey') throw err
          }
          const base = basename(objectPath)
          if (base && base !== objectPath) {
            const stream = await client.getObject(bucket, base)
            return { stream, source: 'minio-env-root-fallback' }
          }
          throw new Error('NoSuchKey')
        },
      )
    }
    catch (err) {
      console.warn('[storage] MinIO get failed, trying local:', err?.message || err)
    }
  }

  const localPath = await findLocalFile(objectPath)
  if (localPath) {
    return { stream: createReadStream(localPath), source: 'local', localPath }
  }

  // Driver local, tapi object hanya ada di MinIO (hasil migrate sebelumnya)
  if (driver === 'local') {
    try {
      const client = useMinioClient()
      const stream = await client.getObject(minio.bucket, objectPath)
      return { stream, source: 'minio-fallback' }
    }
    catch {
      // ignore
    }
  }

  throw createError({
    statusCode: 404,
    statusMessage: 'File lampiran tidak ditemukan di penyimpanan',
  })
}

export async function generatePresignedUploadUrl(objectName, expiry = 3600) {
  const bucket = await ensureMinioBucket()
  return useMinioClient().presignedPutObject(bucket, objectName, expiry)
}

export async function generatePresignedDownloadUrl(objectName, expiry = 3600) {
  const { minio } = getStorageConfig()
  return useMinioClient().presignedGetObject(minio.bucket, objectName, expiry)
}

function guessExt(mimeType) {
  const map = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  }
  return map[mimeType] || ''
}

export function isMissingPath(path) {
  return !path || String(path).startsWith('legacy-missing/')
}

export function storageExistsSync(objectPath) {
  const { uploadDir } = getStorageConfig()
  return candidateLocalPaths(uploadDir, objectPath).some((p) => existsSync(p))
}

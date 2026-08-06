import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { Client } from 'minio'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { getStorageConfig } from '../../utils/storage.js'

/** Rekursif list semua file di folder uploads lokal dengan relative path */
async function listLocalFiles(dir, base = '') {
  const results = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      const rel = base ? `${base}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        results.push(...(await listLocalFiles(full, rel)))
      }
      else if (entry.isFile()) {
        const s = await stat(full)
        results.push({ path: rel, size: s.size, fullPath: full })
      }
    }
  }
  catch {
    // dir doesn't exist — skip
  }
  return results
}

/** Coba buat MinIO client, fallback ke .env jika DB overlay gagal */
async function makeMinioClient() {
  const config = useRuntimeConfig()

  const candidates = []

  // 1. DB overlay
  const dbcfg = getStorageConfig()
  if (dbcfg.minio.endpoint) {
    candidates.push({ ...dbcfg.minio, source: 'db' })
  }

  // 2. .env fallback (selalu coba, meskipun endpoint sama)
  const envEndpoint = String(config.minio?.endpoint || '').replace(/^https?:\/\//, '')
  if (envEndpoint) {
    candidates.push({
      endpoint: envEndpoint,
      port: Number(config.minio?.port || 9000),
      useSSL: String(config.minio?.useSSL) === 'true',
      accessKey: config.minio?.accessKey || '',
      secretKey: config.minio?.secretKey || '',
      bucket: config.minio?.bucket || 'mailog',
      source: '.env',
    })
  }

  for (const cfg of candidates) {
    if (!cfg.endpoint) continue
    try {
      const client = new Client({
        endPoint: cfg.endpoint,
        port: cfg.port,
        useSSL: cfg.useSSL,
        accessKey: cfg.accessKey,
        secretKey: cfg.secretKey,
      })
      // Test sebenarnya: coba list buckets untuk validasi kredensial
      await client.listBuckets()
      return { client, minio: cfg, source: cfg.source }
    }
    catch {
      // try next candidate
    }
  }
  return null
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'pengaturan')

  const { driver, uploadDir } = getStorageConfig()
  if (driver !== 'minio') {
    throw createError({ statusCode: 400, statusMessage: 'Storage driver bukan minio. Ubah di Integrasi terlebih dahulu.' })
  }

  const conn = await makeMinioClient()
  if (!conn) {
    throw createError({ statusCode: 502, statusMessage: 'Gagal terhubung ke MinIO — periksa kredensial di Integrasi' })
  }

  const { client, minio } = conn

  try {
    const exists = await client.bucketExists(minio.bucket)
    if (!exists) await client.makeBucket(minio.bucket)
  }
  catch (err) {
    throw createError({ statusCode: 502, statusMessage: `Gagal akses bucket MinIO: ${err?.message || 'unknown'}` })
  }

  const localFiles = await listLocalFiles(uploadDir)
  if (!localFiles.length) {
    return { data: { synced: 0, skipped: 0, errors: 0, message: `Folder ${uploadDir} kosong atau tidak ditemukan` } }
  }

  const results = { synced: 0, skipped: 0, errors: 0, source: conn.source }

  for (const file of localFiles) {
    try {
      let existsInMinio = false
      try {
        const s = await client.statObject(minio.bucket, file.path)
        existsInMinio = s && s.size === file.size
      }
      catch {
        // not found — safe to upload
      }

      if (existsInMinio) {
        results.skipped++
        continue
      }

      const stream = createReadStream(file.fullPath)
      await client.putObject(minio.bucket, file.path, stream, file.size)
      results.synced++
    }
    catch {
      results.errors++
      console.warn('[sync-minio] failed:', file.path)
    }
  }

  return { data: results }
})

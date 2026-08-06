import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { Client } from 'minio'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'pengaturan')

  const config = useRuntimeConfig()
  const { useMinioClient, getStorageConfig } = await import('../../utils/storage.js')

  const bucketsToCheck = []

  // Try config from DB overlay first
  let cfg = getStorageConfig()
  if (cfg.minio.endpoint) {
    bucketsToCheck.push({ ...cfg.minio, label: 'DB' })
  }

  // Also try .env directly (sebagai fallback jika DB overlay gagal)
  const envMinio = {
    endpoint: String(config.minio?.endpoint || '').replace(/^https?:\/\//, ''),
    port: Number(config.minio?.port || 9000),
    useSSL: String(config.minio?.useSSL) === 'true',
    accessKey: config.minio?.accessKey || '',
    secretKey: config.minio?.secretKey || '',
    bucket: config.minio?.bucket || 'mailog',
    label: '.env',
  }
  if (envMinio.endpoint) {
    bucketsToCheck.push(envMinio)
  }

  const errors = []
  for (const cfg of bucketsToCheck) {
    if (!cfg.endpoint) continue
    try {
      const client = new Client({
        endPoint: cfg.endpoint,
        port: cfg.port,
        useSSL: cfg.useSSL,
        accessKey: cfg.accessKey,
        secretKey: cfg.secretKey,
      })
      const exists = await client.bucketExists(cfg.bucket)
      const buckets = await client.listBuckets()
      return {
        data: {
          online: true,
          source: cfg.label,
          endpoint: `${cfg.endpoint}:${cfg.port}`,
          bucket: cfg.bucket,
          bucketExists: exists,
          bucketCount: buckets.length,
          buckets: buckets.map((b) => b.name),
        },
      }
    }
    catch (err) {
      errors.push(`[${cfg.label}] ${err?.message || 'unknown'}`)
    }
  }

  return {
    data: {
      online: false,
      tried: bucketsToCheck.length,
      error: errors.join(' | '),
    },
  }
})

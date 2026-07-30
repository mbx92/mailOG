/**
 * Thin MinIO helpers kept for legacy route imports.
 * Prefer `storage.js` for new code.
 */
import { getStorageConfig, useMinioClient } from './storage.js'

export async function ensureBucket() {
  const { minio } = getStorageConfig()
  const client = useMinioClient()
  const exists = await client.bucketExists(minio.bucket)
  if (!exists) await client.makeBucket(minio.bucket)
  return minio.bucket
}

export function useMinio() {
  return useMinioClient()
}

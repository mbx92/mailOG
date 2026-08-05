import { useDb } from '../db/index.js'
import { appSettings, DEFAULT_SETTINGS } from '../db/schema/app-settings.js'
import { eq } from 'drizzle-orm'

let cache = null
let cacheAt = 0
const TTL = 15_000

export async function getSettingsMap() {
  if (cache && Date.now() - cacheAt < TTL) return cache

  const db = useDb()
  const rows = await db.select().from(appSettings)
  const map = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    if (row.key in map || row.value != null) map[row.key] = row.value ?? ''
  }

  // env fallbacks for integrasi if DB empty
  const config = useRuntimeConfig()
  if (!map.storage_driver) map.storage_driver = config.storage?.driver || 'local'
  if (!map.upload_dir) map.upload_dir = config.storage?.uploadDir || 'uploads/surat'
  if (!map.minio_endpoint) map.minio_endpoint = config.minio?.endpoint || ''
  if (!map.minio_port) map.minio_port = String(config.minio?.port || 9000)
  if (!map.minio_access_key && config.minio?.accessKey) map.minio_access_key = config.minio.accessKey
  if (!map.minio_secret_key && config.minio?.secretKey) map.minio_secret_key = config.minio.secretKey
  if (!map.minio_bucket) map.minio_bucket = config.minio?.bucket || 'mailog'

  cache = map
  cacheAt = Date.now()
  return map
}

export function clearSettingsCache() {
  cache = null
  cacheAt = 0
}

export async function setSettings(partial) {
  const db = useDb()
  const now = new Date()
  for (const [key, value] of Object.entries(partial)) {
    await db
      .insert(appSettings)
      .values({ key, value: value == null ? '' : String(value), updatedAt: now })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: value == null ? '' : String(value), updatedAt: now },
      })
  }
  clearSettingsCache()
  const map = await getSettingsMap()
  try {
    const { setStorageSettingsOverlay } = await import('./storage.js')
    setStorageSettingsOverlay(map)
  }
  catch {
    // ignore
  }
  return map
}

export async function getSetting(key) {
  const map = await getSettingsMap()
  return map[key]
}

/** Public-safe subset for client branding */
export function toPublicSettings(map) {
  return {
    appName: map.app_name || 'MailOG',
    appLogo: map.app_logo || '',
    timezone: map.timezone || 'Asia/Makassar',
  }
}

/** Mask secrets for API response */
export function toAdminSettings(map) {
  return {
    general: {
      appName: map.app_name || 'MailOG',
      appLogo: map.app_logo || '',
      timezone: map.timezone || 'Asia/Makassar',
    },
    integrasi: {
      storageDriver: map.storage_driver || 'local',
      uploadDir: map.upload_dir || 'uploads/surat',
      minioEndpoint: map.minio_endpoint || '',
      minioPort: Number(map.minio_port || 9000),
      minioUseSsl: map.minio_use_ssl === 'true',
      minioAccessKey: map.minio_access_key || '',
      minioSecretKey: map.minio_secret_key ? '••••••••' : '',
      minioSecretKeySet: Boolean(map.minio_secret_key),
      minioBucket: map.minio_bucket || 'mailog',
    },
    sistem: {
      version: '0.1.0',
      nodeEnv: process.env.NODE_ENV || 'development',
      databaseConfigured: Boolean(process.env.DATABASE_URL),
    },
  }
}

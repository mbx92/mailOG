import { z } from 'zod'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { setSettings, toAdminSettings, getSettingsMap } from '../../utils/settings.js'
import { writeAuditLog } from '../../utils/audit.js'

const generalSchema = z.object({
  section: z.literal('general'),
  appName: z.string().min(1).max(100),
  appLogo: z.string().max(500).optional().nullable(),
  timezone: z.string().min(1).max(64),
})

const integrasiSchema = z.object({
  section: z.literal('integrasi'),
  storageDriver: z.enum(['local', 'minio']),
  uploadDir: z.string().min(1).max(255),
  minioEndpoint: z.string().max(255).optional().nullable(),
  minioPort: z.number().int().min(1).max(65535).optional(),
  minioUseSsl: z.boolean().optional(),
  minioAccessKey: z.string().max(255).optional().nullable(),
  minioSecretKey: z.string().max(255).optional().nullable(),
  minioBucket: z.string().max(100).optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'pengaturan')

  const body = await readBody(event)
  let partial = {}

  if (body?.section === 'general') {
    const data = generalSchema.parse(body)
    partial = {
      app_name: data.appName,
      app_logo: data.appLogo || '',
      timezone: data.timezone,
    }
  }
  else if (body?.section === 'integrasi') {
    const data = integrasiSchema.parse(body)
    partial = {
      storage_driver: data.storageDriver,
      upload_dir: data.uploadDir,
      minio_endpoint: data.minioEndpoint || '',
      minio_port: String(data.minioPort || 9000),
      minio_use_ssl: data.minioUseSsl ? 'true' : 'false',
      minio_access_key: data.minioAccessKey || '',
      minio_bucket: data.minioBucket || 'mailog',
    }
    // only update secret if provided and not masked placeholder
    if (data.minioSecretKey && data.minioSecretKey !== '••••••••') {
      partial.minio_secret_key = data.minioSecretKey
    }
  }
  else {
    throw createError({ statusCode: 400, statusMessage: 'section tidak valid' })
  }

  await setSettings(partial)
  await writeAuditLog({
    user,
    aksi: 'edit',
    detail: { entity: 'pengaturan', section: body.section },
    event,
  })

  const map = await getSettingsMap()
  return { data: toAdminSettings(map) }
})

import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import {
  buildObjectPath,
  generatePresignedUploadUrl,
  getStorageConfig,
} from '../../utils/storage.js'

const schema = z.object({
  namaFile: z.string().min(1),
  mimeType: z.string().min(1),
  instansiKode: z.string().min(1).default('GENERAL'),
})

const ALLOWED = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'registrasi_surat')

  const body = schema.parse(await readBody(event))

  if (!ALLOWED.includes(body.mimeType)) {
    throw createError({ statusCode: 400, statusMessage: 'Tipe file tidak diizinkan' })
  }

  const { driver } = getStorageConfig()
  const fileId = randomUUID()
  const ext = extname(body.namaFile) || ''
  const path = buildObjectPath(body.instansiKode.toUpperCase(), new Date(), fileId, ext)

  // Local storage: client harus pakai POST /api/lampiran/upload (multipart)
  if (driver !== 'minio') {
    return {
      data: {
        mode: 'local',
        uploadUrl: null,
        path,
        fileId,
        hint: 'Gunakan POST /api/lampiran/upload (multipart)',
      },
    }
  }

  const uploadUrl = await generatePresignedUploadUrl(path)

  return {
    data: {
      mode: 'minio',
      uploadUrl,
      path,
      fileId,
      expiresIn: 3600,
    },
  }
})

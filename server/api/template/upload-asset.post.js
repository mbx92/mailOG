import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { templateSurat } from '../../db/schema/index.js'
import { can, requireAuthUser } from '../../utils/rbac.js'
import { saveFile } from '../../utils/storage.js'
import { writeAuditLog } from '../../utils/audit.js'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 5 * 1024 * 1024

const metaSchema = z.object({
  templateId: z.string().uuid(),
  type: z.enum(['kop', 'footer']),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Form upload kosong' })
  }

  const filePart = parts.find((p) => p.name === 'file' && p.data)
  if (!filePart) {
    throw createError({ statusCode: 400, statusMessage: 'File wajib diunggah' })
  }

  const getText = (name) => {
    const part = parts.find((p) => p.name === name && !p.filename)
    return part?.data?.toString('utf8') ?? ''
  }

  const meta = metaSchema.parse({
    templateId: getText('templateId'),
    type: getText('type') || 'kop',
  })

  const mimeType = filePart.type || 'application/octet-stream'
  const buffer = filePart.data
  if (!ALLOWED.has(mimeType)) {
    throw createError({ statusCode: 400, statusMessage: 'Hanya gambar JPG/PNG/WebP/GIF' })
  }
  if (buffer.length > MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Ukuran maksimal 5 MB' })
  }
  if (!buffer.length) {
    throw createError({ statusCode: 400, statusMessage: 'File kosong' })
  }

  const db = useDb()
  const existing = await db.query.templateSurat.findFirst({
    where: and(eq(templateSurat.id, meta.templateId), isNull(templateSurat.deletedAt)),
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Template tidak ditemukan' })
  }

  const saved = await saveFile({
    buffer,
    namaFile: filePart.filename || `${meta.type}.png`,
    mimeType,
    instansiKode: 'TEMPLATES',
  })

  const patch = {
    updatedAt: new Date(),
    ...(meta.type === 'kop' ? { kopImage: saved.path } : { footerImage: saved.path }),
  }

  const [row] = await db
    .update(templateSurat)
    .set(patch)
    .where(eq(templateSurat.id, meta.templateId))
    .returning()

  await writeAuditLog({
    user,
    aksi: 'upload',
    detail: { entity: 'template_surat', type: meta.type, path: saved.path },
    event,
  })

  return {
    data: {
      path: saved.path,
      type: meta.type,
      url: `/api/template/${meta.templateId}/asset?type=${meta.type}`,
      template: row,
    },
  }
})

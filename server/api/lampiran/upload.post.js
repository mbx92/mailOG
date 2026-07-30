import { z } from 'zod'
import { useDb } from '../../db/index.js'
import { lampiran, suratMasuk, suratKeluar } from '../../db/schema/index.js'
import { and, eq, isNull } from 'drizzle-orm'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { saveFile } from '../../utils/storage.js'
import { writeAuditLog } from '../../utils/audit.js'

const ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

const metaSchema = z.object({
  suratId: z.string().uuid(),
  jenis: z.enum(['masuk', 'keluar']),
  instansiKode: z.string().min(1).max(40).optional().default('GENERAL'),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'registrasi_surat')

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
    suratId: getText('suratId'),
    jenis: getText('jenis') || 'masuk',
    instansiKode: getText('instansiKode') || 'GENERAL',
  })

  const namaFile = filePart.filename || 'lampiran'
  const mimeType = filePart.type || 'application/octet-stream'
  const buffer = filePart.data

  if (!ALLOWED.has(mimeType)) {
    throw createError({ statusCode: 400, statusMessage: 'Tipe file tidak diizinkan' })
  }
  if (buffer.length > MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Ukuran file maksimal 20 MB' })
  }
  if (buffer.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'File kosong' })
  }

  const db = useDb()

  if (meta.jenis === 'masuk') {
    const surat = await db.query.suratMasuk.findFirst({
      where: and(eq(suratMasuk.id, meta.suratId), isNull(suratMasuk.deletedAt)),
      columns: { id: true },
    })
    if (!surat) throw createError({ statusCode: 404, statusMessage: 'Surat masuk tidak ditemukan' })
  }
  else {
    const surat = await db.query.suratKeluar.findFirst({
      where: and(eq(suratKeluar.id, meta.suratId), isNull(suratKeluar.deletedAt)),
      columns: { id: true },
    })
    if (!surat) throw createError({ statusCode: 404, statusMessage: 'Surat keluar tidak ditemukan' })
  }

  const saved = await saveFile({
    buffer,
    namaFile,
    mimeType,
    instansiKode: meta.instansiKode,
  })

  const [row] = await db
    .insert(lampiran)
    .values({
      suratId: meta.suratId,
      jenis: meta.jenis,
      namaFile,
      path: saved.path,
      mimeType,
      size: saved.size,
      uploadedBy: user.id,
    })
    .returning()

  await writeAuditLog({
    user,
    suratId: meta.suratId,
    aksi: 'upload',
    detail: { lampiranId: row.id, namaFile, driver: saved.driver },
    event,
  })

  return { data: row }
})

import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../../db/index.js'
import { templateSurat } from '../../../db/schema/index.js'
import { can, requireAuthUser } from '../../../utils/rbac.js'
import { openFileStream } from '../../../utils/storage.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat') && !can(user.level, 'lihat_all')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const type = query.type === 'footer' ? 'footer' : 'kop'
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const db = useDb()
  const row = await db.query.templateSurat.findFirst({
    where: and(eq(templateSurat.id, id), isNull(templateSurat.deletedAt)),
    columns: { kopImage: true, footerImage: true },
  })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Template tidak ditemukan' })

  const path = type === 'footer' ? row.footerImage : row.kopImage
  if (!path) throw createError({ statusCode: 404, statusMessage: 'Gambar belum diunggah' })

  const { stream } = await openFileStream(path)
  const lower = String(path).toLowerCase()
  const mime = lower.endsWith('.png')
    ? 'image/png'
    : lower.endsWith('.webp')
      ? 'image/webp'
      : lower.endsWith('.gif')
        ? 'image/gif'
        : 'image/jpeg'

  setHeader(event, 'Content-Type', mime)
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  return sendStream(event, stream)
})

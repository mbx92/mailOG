import { eq } from 'drizzle-orm'
import { useDb } from '../../../db/index.js'
import { lampiran } from '../../../db/schema/index.js'
import { requireAuthUser } from '../../../utils/rbac.js'
import { isMissingPath, openFileStream } from '../../../utils/storage.js'
import { writeAuditLog } from '../../../utils/audit.js'

function contentDisposition(kind, filename) {
  const name = String(filename || 'file').replace(/[\r\n"]/g, '')
  const ascii = name.replace(/[^\x20-\x7E]/g, '_') || 'file'
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const query = getQuery(event)
  const asDownload = query.download === '1' || query.download === 'true'

  const db = useDb()
  const file = await db.query.lampiran.findFirst({
    where: eq(lampiran.id, id),
  })

  if (!file) throw createError({ statusCode: 404, statusMessage: 'Lampiran tidak ditemukan' })

  if (isMissingPath(file.path)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'File lampiran tidak tersedia di penyimpanan',
    })
  }

  let stream
  try {
    ;({ stream } = await openFileStream(file.path))
  }
  catch (err) {
    if (err?.statusCode) throw err
    throw createError({
      statusCode: 404,
      statusMessage: 'File lampiran tidak ditemukan di penyimpanan',
    })
  }

  await writeAuditLog({
    user,
    suratId: file.suratId,
    aksi: asDownload ? 'download' : 'lihat',
    detail: { lampiranId: file.id, namaFile: file.namaFile },
    event,
  })

  setHeader(event, 'Content-Type', file.mimeType || 'application/octet-stream')
  setHeader(
    event,
    'Content-Disposition',
    contentDisposition(asDownload ? 'attachment' : 'inline', file.namaFile),
  )
  if (file.size) setHeader(event, 'Content-Length', String(file.size))
  setHeader(event, 'Cache-Control', 'private, max-age=60')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')

  return sendStream(event, stream)
})

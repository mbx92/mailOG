import { eq } from 'drizzle-orm'
import { useDb } from '../../../db/index.js'
import { lampiran } from '../../../db/schema/index.js'
import { requireAuthUser } from '../../../utils/rbac.js'
import { generatePresignedDownloadUrl } from '../../../utils/storage.js'
import { writeAuditLog } from '../../../utils/audit.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const db = useDb()
  const file = await db.query.lampiran.findFirst({
    where: eq(lampiran.id, id),
  })

  if (!file) throw createError({ statusCode: 404, statusMessage: 'Lampiran tidak ditemukan' })

  const downloadUrl = await generatePresignedDownloadUrl(file.path)

  await writeAuditLog({
    user,
    suratId: file.suratId,
    aksi: 'download',
    detail: { lampiranId: file.id },
    event,
  })

  return { data: { downloadUrl, namaFile: file.namaFile, expiresIn: 3600 } }
})

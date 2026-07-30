import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../../db/index.js'
import { suratKeluar } from '../../../db/schema/index.js'
import { can, requireAuthUser } from '../../../utils/rbac.js'
import { writeAuditLog } from '../../../utils/audit.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat') && !can(user.level, 'hapus_surat')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const db = useDb()
  const existing = await db.query.suratKeluar.findFirst({
    where: and(eq(suratKeluar.id, id), isNull(suratKeluar.deletedAt)),
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  if (!['draft', 'ditolak'].includes(existing.status) && !can(user.level, 'hapus_surat')) {
    throw createError({ statusCode: 400, statusMessage: 'Hanya draft/ditolak yang dapat dihapus' })
  }

  const [row] = await db
    .update(suratKeluar)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(suratKeluar.id, id))
    .returning()

  await writeAuditLog({
    user,
    suratId: id,
    aksi: 'hapus',
    detail: { entity: 'surat_keluar' },
    event,
  })

  return { data: row }
})

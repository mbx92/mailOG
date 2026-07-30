import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../../db/index.js'
import { suratKeluar } from '../../../db/schema/index.js'
import { can, requireAuthUser } from '../../../utils/rbac.js'
import { writeAuditLog } from '../../../utils/audit.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'approve_surat')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan approve' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const db = useDb()
  const existing = await db.query.suratKeluar.findFirst({
    where: and(eq(suratKeluar.id, id), isNull(suratKeluar.deletedAt)),
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  if (existing.status !== 'menunggu_approval') {
    throw createError({ statusCode: 400, statusMessage: 'Surat tidak menunggu approval' })
  }

  const [row] = await db
    .update(suratKeluar)
    .set({
      status: 'disetujui',
      approvedBy: user.id,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(suratKeluar.id, id))
    .returning()

  await writeAuditLog({
    user,
    suratId: id,
    aksi: 'approve',
    detail: { entity: 'surat_keluar' },
    event,
  })

  return { data: row }
})

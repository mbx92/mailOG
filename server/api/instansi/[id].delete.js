import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { instansi } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'manage_instansi')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const db = useDb()
  const [row] = await db
    .update(instansi)
    .set({ deletedAt: new Date(), updatedAt: new Date(), status: 'nonaktif' })
    .where(and(eq(instansi.id, id), isNull(instansi.deletedAt)))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Instansi tidak ditemukan' })

  await writeAuditLog({
    user,
    aksi: 'hapus',
    detail: { entity: 'instansi', id },
    event,
  })

  return { ok: true }
})

import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { unit } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'manage_unit')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const db = useDb()
  const [row] = await db
    .update(unit)
    .set({ deletedAt: new Date(), updatedAt: new Date(), status: 'nonaktif' })
    .where(and(eq(unit.id, id), isNull(unit.deletedAt)))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Unit tidak ditemukan' })

  await writeAuditLog({
    user,
    aksi: 'hapus',
    detail: { entity: 'unit', id },
    event,
  })

  return { ok: true }
})

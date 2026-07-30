import { and, desc, eq, ilike, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { users, USER_LEVEL_LABELS } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'manage_user')

  const query = getQuery(event)
  const db = useDb()
  const conditions = [isNull(users.deletedAt)]

  if (query.q && typeof query.q === 'string') {
    conditions.push(ilike(users.nama, `%${query.q}%`))
  }
  if (query.unitId && typeof query.unitId === 'string') {
    conditions.push(eq(users.unitId, query.unitId))
  }

  const rows = await db.query.users.findMany({
    where: and(...conditions),
    with: { unit: true },
    orderBy: [desc(users.createdAt)],
  })

  return {
    data: rows.map((u) => ({
      id: u.id,
      nama: u.nama,
      email: u.email,
      level: u.level,
      levelLabel: USER_LEVEL_LABELS[u.level],
      jabatan: u.jabatan,
      noTelp: u.noTelp,
      isActive: u.isActive,
      unitId: u.unitId,
      unit: u.unit ? { id: u.unit.id, nama: u.unit.nama, kode: u.unit.kode } : null,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
    })),
  }
})

import { and, count, desc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { useDb } from '../../db/index.js'
import { trackingLog, users } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'pengaturan')

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 30))
  const offset = (page - 1) * limit
  const db = useDb()
  const actor = alias(users, 'actor')

  const conditions = []
  if (query.aksi && typeof query.aksi === 'string') {
    conditions.push(eq(trackingLog.aksi, query.aksi))
  }

  const where = conditions.length ? and(...conditions) : undefined

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: trackingLog.id,
        suratId: trackingLog.suratId,
        userId: trackingLog.userId,
        aksi: trackingLog.aksi,
        detail: trackingLog.detail,
        ipAddress: trackingLog.ipAddress,
        createdAt: trackingLog.createdAt,
        userNama: actor.nama,
        userEmail: actor.email,
      })
      .from(trackingLog)
      .leftJoin(actor, eq(trackingLog.userId, actor.id))
      .where(where)
      .orderBy(desc(trackingLog.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(trackingLog).where(where),
  ])

  return {
    data: rows,
    meta: {
      page,
      limit,
      total: totalResult[0]?.value ?? 0,
      totalPages: Math.ceil((totalResult[0]?.value ?? 0) / limit) || 1,
    },
  }
})

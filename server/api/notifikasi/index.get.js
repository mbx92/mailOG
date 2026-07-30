import { and, count, desc, eq } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { notifikasi } from '../../db/schema/index.js'
import { requireAuthUser } from '../../utils/rbac.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const query = getQuery(event)
  const db = useDb()

  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  const unreadOnly = query.unread === '1' || query.unread === 'true'

  const conditions = [eq(notifikasi.userId, user.id)]
  if (unreadOnly) conditions.push(eq(notifikasi.isRead, false))
  const where = and(...conditions)

  const [rows, unreadCount, total] = await Promise.all([
    db
      .select()
      .from(notifikasi)
      .where(where)
      .orderBy(desc(notifikasi.createdAt))
      .limit(limit),
    db
      .select({ value: count() })
      .from(notifikasi)
      .where(and(eq(notifikasi.userId, user.id), eq(notifikasi.isRead, false))),
    db
      .select({ value: count() })
      .from(notifikasi)
      .where(eq(notifikasi.userId, user.id)),
  ])

  return {
    data: rows,
    meta: {
      unread: unreadCount[0]?.value ?? 0,
      total: total[0]?.value ?? 0,
    },
  }
})

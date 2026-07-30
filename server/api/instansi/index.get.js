import { and, desc, eq, ilike, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { instansi } from '../../db/schema/index.js'
import { requireAuthUser } from '../../utils/rbac.js'

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const query = getQuery(event)
  const db = useDb()

  const conditions = [isNull(instansi.deletedAt)]
  if (query.q && typeof query.q === 'string') {
    conditions.push(ilike(instansi.nama, `%${query.q}%`))
  }
  if (query.status === 'aktif' || query.status === 'nonaktif') {
    conditions.push(eq(instansi.status, query.status))
  }

  const rows = await db
    .select()
    .from(instansi)
    .where(and(...conditions))
    .orderBy(desc(instansi.createdAt))

  return { data: rows }
})

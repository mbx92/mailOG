import { and, desc, eq, ilike, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { unit } from '../../db/schema/index.js'
import { requireAuthUser } from '../../utils/rbac.js'

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const query = getQuery(event)
  const db = useDb()

  const conditions = [isNull(unit.deletedAt)]
  if (query.instansiId && typeof query.instansiId === 'string') {
    conditions.push(eq(unit.instansiId, query.instansiId))
  }
  if (query.q && typeof query.q === 'string') {
    conditions.push(ilike(unit.nama, `%${query.q}%`))
  }

  const rows = await db.query.unit.findMany({
    where: and(...conditions),
    with: { instansi: true },
    orderBy: [desc(unit.createdAt)],
  })

  return { data: rows }
})

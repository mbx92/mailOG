import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { instansi } from '../../db/schema/index.js'
import { requireAuthUser } from '../../utils/rbac.js'

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const db = useDb()
  const row = await db.query.instansi.findFirst({
    where: and(eq(instansi.id, id), isNull(instansi.deletedAt)),
  })

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Instansi tidak ditemukan' })
  return { data: row }
})

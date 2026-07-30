import { asc } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { klasifikasiSurat } from '../../db/schema/index.js'
import { requireAuthUser } from '../../utils/rbac.js'

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const db = useDb()
  const rows = await db
    .select()
    .from(klasifikasiSurat)
    .orderBy(asc(klasifikasiSurat.urutan))
  return { data: rows }
})

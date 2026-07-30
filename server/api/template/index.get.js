import { and, count, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { templateSurat, unit } from '../../db/schema/index.js'
import { can, requireAuthUser } from '../../utils/rbac.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const query = getQuery(event)
  const db = useDb()
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  const offset = (page - 1) * limit

  const conditions = [isNull(templateSurat.deletedAt)]
  if (query.q && typeof query.q === 'string') {
    conditions.push(
      or(
        ilike(templateSurat.nama, `%${query.q}%`),
        ilike(templateSurat.kode, `%${query.q}%`),
      ),
    )
  }

  const where = and(...conditions)
  const [rows, totalResult] = await Promise.all([
    db.query.templateSurat.findMany({
      where,
      orderBy: [desc(templateSurat.isDefault), desc(templateSurat.updatedAt)],
      limit,
      offset,
    }),
    db.select({ value: count() }).from(templateSurat).where(where),
  ])

  const unitIds = [...new Set(rows.map((r) => r.unitId).filter(Boolean))]
  let unitMap = new Map()
  if (unitIds.length) {
    const units = await db
      .select({ id: unit.id, nama: unit.nama, kode: unit.kode })
      .from(unit)
      .where(inArray(unit.id, unitIds))
    unitMap = new Map(units.map((u) => [u.id, u]))
  }

  const total = totalResult[0]?.value ?? 0
  return {
    data: rows.map((r) => ({
      ...r,
      unit: r.unitId ? unitMap.get(r.unitId) || null : null,
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  }
})

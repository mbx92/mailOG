import { and, count, desc, eq, ilike, isNull, or } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { suratKeluar } from '../../db/schema/index.js'
import { can, requireAuthUser } from '../../utils/rbac.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat') && !can(user.level, 'lihat_all')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const query = getQuery(event)
  const db = useDb()

  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10))
  const offset = (page - 1) * limit

  const conditions = [isNull(suratKeluar.deletedAt)]

  if (query.status && typeof query.status === 'string') {
    conditions.push(eq(suratKeluar.status, query.status))
  }

  if (query.q && typeof query.q === 'string') {
    conditions.push(
      or(
        ilike(suratKeluar.perihal, `%${query.q}%`),
        ilike(suratKeluar.nomorSurat, `%${query.q}%`),
        ilike(suratKeluar.penerima, `%${query.q}%`),
      ),
    )
  }

  const where = and(...conditions)

  const [rows, totalResult] = await Promise.all([
    db.query.suratKeluar.findMany({
      where,
      with: {
        tujuanInstansi: true,
        unit: true,
        klasifikasi: true,
      },
      orderBy: [desc(suratKeluar.tanggalSurat), desc(suratKeluar.createdAt)],
      limit,
      offset,
    }),
    db.select({ value: count() }).from(suratKeluar).where(where),
  ])

  const total = totalResult[0]?.value ?? 0

  return {
    data: rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
})

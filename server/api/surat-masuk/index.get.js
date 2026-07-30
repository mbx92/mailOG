import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { suratMasuk, disposisi } from '../../db/schema/index.js'
import { can, requireAuthUser } from '../../utils/rbac.js'

/**
 * Inbox rules:
 * - Admin/sekretaris/direksi (registrasi or lihat_all): semua surat masuk
 * - Staff unit: hanya surat yang didisposisikan ke unit / user mereka (inbox unit)
 */
async function buildInboxFilter(db, user) {
  const conditions = [isNull(suratMasuk.deletedAt)]

  const isOps = can(user.level, 'registrasi_surat') || can(user.level, 'lihat_all')
  if (isOps) return { conditions, mode: 'all' }

  if (!user.unitId && !user.id) {
    conditions.push(sql`false`)
    return { conditions, mode: 'empty' }
  }

  const disposed = await db
    .selectDistinct({ suratId: disposisi.suratId })
    .from(disposisi)
    .where(
      or(
        user.unitId ? eq(disposisi.keUnitId, user.unitId) : sql`false`,
        eq(disposisi.keUserId, user.id),
      ),
    )

  const ids = disposed.map((d) => d.suratId).filter(Boolean)
  if (!ids.length) {
    conditions.push(sql`false`)
    return { conditions, mode: 'unit-inbox' }
  }

  conditions.push(inArray(suratMasuk.id, ids))
  return { conditions, mode: 'unit-inbox' }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const query = getQuery(event)
  const db = useDb()

  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10))
  const offset = (page - 1) * limit

  const { conditions, mode } = await buildInboxFilter(db, user)

  if (query.status && typeof query.status === 'string') {
    conditions.push(eq(suratMasuk.status, query.status))
  }

  if (query.q && typeof query.q === 'string') {
    conditions.push(
      or(
        ilike(suratMasuk.perihal, `%${query.q}%`),
        ilike(suratMasuk.nomorSurat, `%${query.q}%`),
        ilike(suratMasuk.pengirim, `%${query.q}%`),
      ),
    )
  }

  const where = and(...conditions)

  const [rows, totalResult] = await Promise.all([
    db.query.suratMasuk.findMany({
      where,
      with: {
        asalInstansi: true,
        tujuanUnit: true,
        klasifikasi: true,
      },
      orderBy: [desc(suratMasuk.tanggalDiterima), desc(suratMasuk.createdAt)],
      limit,
      offset,
    }),
    db.select({ value: count() }).from(suratMasuk).where(where),
  ])

  const total = totalResult[0]?.value ?? 0

  return {
    data: rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      mode,
    },
  }
})

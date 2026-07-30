import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { disposisi, suratMasuk, unit, users } from '../../db/schema/index.js'
import { alias } from 'drizzle-orm/pg-core'
import { can, requireAuthUser } from '../../utils/rbac.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const query = getQuery(event)
  const db = useDb()

  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  const offset = (page - 1) * limit

  const dariUser = alias(users, 'dari_user')
  const keUser = alias(users, 'ke_user')

  const conditions = []

  if (query.status && typeof query.status === 'string') {
    conditions.push(eq(disposisi.status, query.status))
  }

  // Unit staff: hanya disposisi ke unit/user mereka
  // Admin/sekretaris (can disposisi): lihat semua untuk monitoring
  if (!can(user.level, 'disposisi') && !can(user.level, 'lihat_all')) {
    if (user.unitId) {
      conditions.push(
        or(eq(disposisi.keUnitId, user.unitId), eq(disposisi.keUserId, user.id)),
      )
    }
    else {
      conditions.push(eq(disposisi.keUserId, user.id))
    }
  }

  if (query.q && typeof query.q === 'string') {
    conditions.push(
      or(
        ilike(suratMasuk.perihal, `%${query.q}%`),
        ilike(suratMasuk.nomorSurat, `%${query.q}%`),
        ilike(disposisi.instruksi, `%${query.q}%`),
      ),
    )
  }

  const where = conditions.length ? and(...conditions) : undefined

  const base = db
    .select({
      id: disposisi.id,
      suratId: disposisi.suratId,
      instruksi: disposisi.instruksi,
      batasWaktu: disposisi.batasWaktu,
      status: disposisi.status,
      createdAt: disposisi.createdAt,
      updatedAt: disposisi.updatedAt,
      nomorSurat: suratMasuk.nomorSurat,
      perihal: suratMasuk.perihal,
      keUnitNama: unit.nama,
      dariUserNama: dariUser.nama,
      keUserNama: keUser.nama,
    })
    .from(disposisi)
    .leftJoin(suratMasuk, eq(disposisi.suratId, suratMasuk.id))
    .leftJoin(unit, eq(disposisi.keUnitId, unit.id))
    .leftJoin(dariUser, eq(disposisi.dariUserId, dariUser.id))
    .leftJoin(keUser, eq(disposisi.keUserId, keUser.id))

  const [rows, totalResult] = await Promise.all([
    base
      .where(where)
      .orderBy(desc(disposisi.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(disposisi)
      .leftJoin(suratMasuk, eq(disposisi.suratId, suratMasuk.id))
      .where(where),
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

import { and, count, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { suratMasuk, suratKeluar, disposisi } from '../../db/schema/index.js'
import { can, requireAuthUser } from '../../utils/rbac.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const db = useDb()
  const isOps = can(user.level, 'lihat_all') || can(user.level, 'registrasi_surat')
  const unitId = user.unitId || null

  let masukConds = [isNull(suratMasuk.deletedAt)]
  let keluarConds = [isNull(suratKeluar.deletedAt)]
  let dspPendingConds = [eq(disposisi.status, 'diterima')]
  let masukBaruConds = [isNull(suratMasuk.deletedAt), eq(suratMasuk.status, 'baru')]
  let recentConds = [isNull(suratMasuk.deletedAt)]
  let scope = 'all'

  if (!isOps) {
    scope = 'unit-inbox'
    if (!unitId && !user.id) {
      return {
        data: {
          scope: 'empty',
          role: 'unit',
          stats: { suratMasuk: 0, suratKeluar: 0, disposisiPending: 0, suratMasukBaru: 0 },
          recent: [],
        },
      }
    }

    const disposed = await db
      .selectDistinct({ suratId: disposisi.suratId })
      .from(disposisi)
      .where(
        or(
          unitId ? eq(disposisi.keUnitId, unitId) : sql`false`,
          eq(disposisi.keUserId, user.id),
        ),
      )
    const ids = disposed.map((d) => d.suratId).filter(Boolean)

    if (!ids.length) {
      masukConds.push(sql`false`)
      masukBaruConds.push(sql`false`)
      recentConds.push(sql`false`)
    }
    else {
      masukConds.push(inArray(suratMasuk.id, ids))
      masukBaruConds.push(inArray(suratMasuk.id, ids))
      recentConds.push(inArray(suratMasuk.id, ids))
    }

    // unit staff biasanya tidak kelola surat keluar
    keluarConds.push(sql`false`)
    dspPendingConds.push(
      or(
        unitId ? eq(disposisi.keUnitId, unitId) : sql`false`,
        eq(disposisi.keUserId, user.id),
      ),
    )
  }

  const [masukTotal, keluarTotal, disposisiPending, masukBaru] = await Promise.all([
    db.select({ value: count() }).from(suratMasuk).where(and(...masukConds)),
    db.select({ value: count() }).from(suratKeluar).where(and(...keluarConds)),
    db.select({ value: count() }).from(disposisi).where(and(...dspPendingConds)),
    db.select({ value: count() }).from(suratMasuk).where(and(...masukBaruConds)),
  ])

  const recent = await db.query.suratMasuk.findMany({
    where: and(...recentConds),
    with: { asalInstansi: true, klasifikasi: true },
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
    limit: 5,
  })

  return {
    data: {
      scope,
      role: isOps ? 'ops' : 'unit',
      unitId: isOps ? null : unitId,
      stats: {
        suratMasuk: masukTotal[0]?.value ?? 0,
        suratKeluar: keluarTotal[0]?.value ?? 0,
        disposisiPending: disposisiPending[0]?.value ?? 0,
        suratMasukBaru: masukBaru[0]?.value ?? 0,
      },
      recent,
    },
  }
})

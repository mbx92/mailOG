import {
  and,
  count,
  eq,
  gte,
  isNull,
  lte,
  or,
  sql,
  inArray,
} from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { suratMasuk, suratKeluar, disposisi, unit } from '../../db/schema/index.js'
import { can, requireAuthUser, requirePermission } from '../../utils/rbac.js'

function monthBounds(tahun, bulan) {
  const y = Number(tahun)
  const m = Number(bulan)
  if (!y || y < 2000 || y > 2100) return null
  if (m) {
    if (m < 1 || m > 12) return null
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const last = new Date(y, m, 0).getDate()
    const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
    return { start, end, tahun: y, bulan: m }
  }
  return {
    start: `${y}-01-01`,
    end: `${y}-12-31`,
    tahun: y,
    bulan: null,
  }
}

async function unitInboxIds(db, user) {
  const disposed = await db
    .selectDistinct({ suratId: disposisi.suratId })
    .from(disposisi)
    .where(
      or(
        user.unitId ? eq(disposisi.keUnitId, user.unitId) : sql`false`,
        eq(disposisi.keUserId, user.id),
      ),
    )
  return disposed.map((d) => d.suratId).filter(Boolean)
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'export')

  const query = getQuery(event)
  const now = new Date()
  const tahun = Number(query.tahun) || now.getFullYear()
  const bulan = query.bulan === '' || query.bulan == null ? null : Number(query.bulan)
  const bounds = monthBounds(tahun, bulan)
  if (!bounds) {
    throw createError({ statusCode: 400, statusMessage: 'Tahun/bulan tidak valid' })
  }

  const db = useDb()
  const isOps = can(user.level, 'registrasi_surat') || can(user.level, 'lihat_all')

  const masukBase = [
    isNull(suratMasuk.deletedAt),
    gte(suratMasuk.tanggalDiterima, bounds.start),
    lte(suratMasuk.tanggalDiterima, bounds.end),
  ]
  const keluarBase = [
    isNull(suratKeluar.deletedAt),
    gte(suratKeluar.tanggalSurat, bounds.start),
    lte(suratKeluar.tanggalSurat, bounds.end),
  ]
  const dspBase = [
    gte(sql`(${disposisi.createdAt})::date`, bounds.start),
    lte(sql`(${disposisi.createdAt})::date`, bounds.end),
  ]

  if (!isOps) {
    const ids = await unitInboxIds(db, user)
    if (!ids.length) {
      masukBase.push(sql`false`)
    }
    else {
      masukBase.push(inArray(suratMasuk.id, ids))
    }
    keluarBase.push(sql`false`)
    dspBase.push(
      or(
        user.unitId ? eq(disposisi.keUnitId, user.unitId) : sql`false`,
        eq(disposisi.keUserId, user.id),
      ),
    )
  }

  const [
    masukTotal,
    keluarTotal,
    dspTotal,
    masukByStatus,
    keluarByStatus,
    dspByStatus,
    masukByUnit,
    dspByUnit,
    trendMasuk,
  ] = await Promise.all([
    db.select({ value: count() }).from(suratMasuk).where(and(...masukBase)),
    db.select({ value: count() }).from(suratKeluar).where(and(...keluarBase)),
    db.select({ value: count() }).from(disposisi).where(and(...dspBase)),
    db
      .select({ status: suratMasuk.status, value: count() })
      .from(suratMasuk)
      .where(and(...masukBase))
      .groupBy(suratMasuk.status),
    db
      .select({ status: suratKeluar.status, value: count() })
      .from(suratKeluar)
      .where(and(...keluarBase))
      .groupBy(suratKeluar.status),
    db
      .select({ status: disposisi.status, value: count() })
      .from(disposisi)
      .where(and(...dspBase))
      .groupBy(disposisi.status),
    db
      .select({
        unitId: suratMasuk.tujuanUnitId,
        unitNama: unit.nama,
        value: count(),
      })
      .from(suratMasuk)
      .leftJoin(unit, eq(suratMasuk.tujuanUnitId, unit.id))
      .where(and(...masukBase))
      .groupBy(suratMasuk.tujuanUnitId, unit.nama)
      .orderBy(sql`count(*) desc`)
      .limit(12),
    db
      .select({
        unitId: disposisi.keUnitId,
        unitNama: unit.nama,
        value: count(),
      })
      .from(disposisi)
      .leftJoin(unit, eq(disposisi.keUnitId, unit.id))
      .where(and(...dspBase))
      .groupBy(disposisi.keUnitId, unit.nama)
      .orderBy(sql`count(*) desc`)
      .limit(12),
    // 12 bulan terakhir (surat masuk by tanggal_diterima)
    db.execute(sql`
      select to_char(date_trunc('month', tanggal_diterima::timestamp), 'YYYY-MM') as bulan,
             count(*)::int as value
      from surat_masuk
      where deleted_at is null
        and tanggal_diterima >= (current_date - interval '11 months')
        ${isOps ? sql`` : user.unitId
          ? sql`and id in (
              select distinct surat_id from disposisi
              where ke_unit_id = ${user.unitId} or ke_user_id = ${user.id}
            )`
          : sql`and false`}
      group by 1
      order by 1
    `),
  ])

  const trendRows = Array.isArray(trendMasuk)
    ? trendMasuk
    : (trendMasuk?.rows || [])

  return {
    data: {
      periode: {
        tahun: bounds.tahun,
        bulan: bounds.bulan,
        start: bounds.start,
        end: bounds.end,
        label: bounds.bulan
          ? `${String(bounds.bulan).padStart(2, '0')}/${bounds.tahun}`
          : `Tahun ${bounds.tahun}`,
      },
      scope: isOps ? 'all' : 'unit',
      ringkasan: {
        suratMasuk: masukTotal[0]?.value ?? 0,
        suratKeluar: keluarTotal[0]?.value ?? 0,
        disposisi: dspTotal[0]?.value ?? 0,
      },
      suratMasukByStatus: masukByStatus.map((r) => ({
        status: r.status,
        value: Number(r.value),
      })),
      suratKeluarByStatus: keluarByStatus.map((r) => ({
        status: r.status,
        value: Number(r.value),
      })),
      disposisiByStatus: dspByStatus.map((r) => ({
        status: r.status,
        value: Number(r.value),
      })),
      suratMasukByUnit: masukByUnit.map((r) => ({
        unitId: r.unitId,
        nama: r.unitNama || '(tanpa unit)',
        value: Number(r.value),
      })),
      disposisiByUnit: dspByUnit.map((r) => ({
        unitId: r.unitId,
        nama: r.unitNama || '(tanpa unit)',
        value: Number(r.value),
      })),
      trendBulanan: trendRows.map((r) => ({
        bulan: r.bulan,
        value: Number(r.value),
      })),
    },
  }
})

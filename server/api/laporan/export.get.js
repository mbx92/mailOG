import {
  and,
  desc,
  eq,
  gte,
  isNull,
  lte,
  or,
  sql,
  inArray,
} from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { suratMasuk, suratKeluar, disposisi, unit, instansi } from '../../db/schema/index.js'
import { can, requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

function monthBounds(tahun, bulan) {
  const y = Number(tahun)
  const m = Number(bulan)
  if (!y || y < 2000 || y > 2100) return null
  if (m) {
    if (m < 1 || m > 12) return null
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const last = new Date(y, m, 0).getDate()
    const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
    return { start, end }
  }
  return { start: `${y}-01-01`, end: `${y}-12-31` }
}

function csvEscape(v) {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(headers, rows) {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','))
  }
  return `\uFEFF${lines.join('\n')}`
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'export')

  const query = getQuery(event)
  const type = String(query.type || 'surat-masuk')
  const now = new Date()
  const tahun = Number(query.tahun) || now.getFullYear()
  const bulan = query.bulan === '' || query.bulan == null ? null : Number(query.bulan)
  const bounds = monthBounds(tahun, bulan)
  if (!bounds) {
    throw createError({ statusCode: 400, statusMessage: 'Tahun/bulan tidak valid' })
  }

  const db = useDb()
  const isOps = can(user.level, 'registrasi_surat') || can(user.level, 'lihat_all')

  let csv = ''
  let filename = `laporan-${type}-${tahun}${bulan ? `-${String(bulan).padStart(2, '0')}` : ''}.csv`

  if (type === 'surat-masuk') {
    const conds = [
      isNull(suratMasuk.deletedAt),
      gte(suratMasuk.tanggalDiterima, bounds.start),
      lte(suratMasuk.tanggalDiterima, bounds.end),
    ]
    if (!isOps) {
      const disposed = await db
        .selectDistinct({ suratId: disposisi.suratId })
        .from(disposisi)
        .where(
          or(
            user.unitId ? eq(disposisi.keUnitId, user.unitId) : sql`false`,
            eq(disposisi.keUserId, user.id),
          ),
        )
      const ids = disposed.map((d) => d.suratId)
      if (!ids.length) conds.push(sql`false`)
      else conds.push(inArray(suratMasuk.id, ids))
    }

    const rows = await db
      .select({
        nomorSurat: suratMasuk.nomorSurat,
        perihal: suratMasuk.perihal,
        pengirim: suratMasuk.pengirim,
        asal: instansi.nama,
        tanggalSurat: suratMasuk.tanggalSurat,
        tanggalDiterima: suratMasuk.tanggalDiterima,
        tujuanUnit: unit.nama,
        status: suratMasuk.status,
      })
      .from(suratMasuk)
      .leftJoin(instansi, eq(suratMasuk.asalInstansiId, instansi.id))
      .leftJoin(unit, eq(suratMasuk.tujuanUnitId, unit.id))
      .where(and(...conds))
      .orderBy(desc(suratMasuk.tanggalDiterima))
      .limit(10000)

    csv = toCsv(
      ['nomorSurat', 'perihal', 'pengirim', 'asal', 'tanggalSurat', 'tanggalDiterima', 'tujuanUnit', 'status'],
      rows,
    )
  }
  else if (type === 'surat-keluar') {
    if (!isOps) {
      throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan export surat keluar' })
    }
    const rows = await db
      .select({
        nomorSurat: suratKeluar.nomorSurat,
        perihal: suratKeluar.perihal,
        penerima: suratKeluar.penerima,
        tanggalSurat: suratKeluar.tanggalSurat,
        unit: unit.nama,
        status: suratKeluar.status,
      })
      .from(suratKeluar)
      .leftJoin(unit, eq(suratKeluar.unitId, unit.id))
      .where(
        and(
          isNull(suratKeluar.deletedAt),
          gte(suratKeluar.tanggalSurat, bounds.start),
          lte(suratKeluar.tanggalSurat, bounds.end),
        ),
      )
      .orderBy(desc(suratKeluar.tanggalSurat))
      .limit(10000)

    csv = toCsv(
      ['nomorSurat', 'perihal', 'penerima', 'tanggalSurat', 'unit', 'status'],
      rows,
    )
  }
  else if (type === 'disposisi') {
    const conds = [
      gte(sql`(${disposisi.createdAt})::date`, bounds.start),
      lte(sql`(${disposisi.createdAt})::date`, bounds.end),
    ]
    if (!isOps) {
      conds.push(
        or(
          user.unitId ? eq(disposisi.keUnitId, user.unitId) : sql`false`,
          eq(disposisi.keUserId, user.id),
        ),
      )
    }
    const rows = await db
      .select({
        nomorSurat: suratMasuk.nomorSurat,
        perihal: suratMasuk.perihal,
        instruksi: disposisi.instruksi,
        keUnit: unit.nama,
        status: disposisi.status,
        batasWaktu: disposisi.batasWaktu,
        createdAt: disposisi.createdAt,
      })
      .from(disposisi)
      .leftJoin(suratMasuk, eq(disposisi.suratId, suratMasuk.id))
      .leftJoin(unit, eq(disposisi.keUnitId, unit.id))
      .where(and(...conds))
      .orderBy(desc(disposisi.createdAt))
      .limit(10000)

    csv = toCsv(
      ['nomorSurat', 'perihal', 'instruksi', 'keUnit', 'status', 'batasWaktu', 'createdAt'],
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
      })),
    )
  }
  else {
    throw createError({ statusCode: 400, statusMessage: 'type tidak valid (surat-masuk|surat-keluar|disposisi)' })
  }

  await writeAuditLog({
    user,
    aksi: 'export',
    detail: { entity: 'laporan', type, tahun, bulan },
    event,
  })

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return csv
})

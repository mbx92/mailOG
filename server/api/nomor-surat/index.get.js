import { and, desc, eq } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { nomorCounter, unit } from '../../db/schema/index.js'
import { can, requireAuthUser } from '../../utils/rbac.js'
import { getSettingsMap } from '../../utils/settings.js'
import { formatNomorSurat, previewNomorSurat } from '../../utils/nomor-generator.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat') && !can(user.level, 'pengaturan')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const query = getQuery(event)
  const db = useDb()
  const settings = await getSettingsMap()
  const now = new Date()
  const tahun = Number(query.tahun) || now.getFullYear()
  const bulan = query.bulan === '' || query.bulan == null ? null : Number(query.bulan)

  const conditions = [eq(nomorCounter.tahun, tahun)]
  if (bulan && bulan >= 1 && bulan <= 12) {
    conditions.push(eq(nomorCounter.bulan, bulan))
  }

  const rows = await db
    .select({
      id: nomorCounter.id,
      unitKode: nomorCounter.unitKode,
      tahun: nomorCounter.tahun,
      bulan: nomorCounter.bulan,
      counter: nomorCounter.counter,
      unitNama: unit.nama,
    })
    .from(nomorCounter)
    .leftJoin(unit, eq(nomorCounter.unitKode, unit.kode))
    .where(and(...conditions))
    .orderBy(desc(nomorCounter.tahun), desc(nomorCounter.bulan), nomorCounter.unitKode)

  const format = settings.nomor_format || '{SEQ} / {UNIT} / {MM} / {YYYY}'
  const seqPad = Number(settings.nomor_seq_pad) || 3

  const data = rows.map((r) => {
    const d = new Date(r.tahun, r.bulan - 1, 1)
    return {
      ...r,
      contohTerakhir: formatNomorSurat({
        format,
        seq: r.counter,
        seqPad,
        unitKode: r.unitKode,
        date: d,
      }),
      contohBerikutnya: formatNomorSurat({
        format,
        seq: r.counter + 1,
        seqPad,
        unitKode: r.unitKode,
        date: d,
      }),
    }
  })

  let preview = null
  if (query.previewUnit) {
    preview = await previewNomorSurat(String(query.previewUnit), now)
  }

  return {
    data: {
      format,
      seqPad,
      tahun,
      bulan,
      counters: data,
      preview,
      tokens: ['{SEQ}', '{UNIT}', '{MM}', '{YYYY}', '{YY}', '{DD}'],
    },
  }
})

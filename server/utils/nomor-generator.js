import { and, eq, sql } from 'drizzle-orm'
import { useDb } from '../db/index.js'
import { nomorCounter } from '../db/schema/index.js'
import { getSettingsMap } from './settings.js'

export function formatNomorSurat({
  format,
  seq,
  seqPad = 3,
  unitKode,
  date = new Date(),
}) {
  const tahun = date.getFullYear()
  const bulan = date.getMonth() + 1
  const hari = date.getDate()
  const tokens = {
    SEQ: String(seq).padStart(Math.max(1, Number(seqPad) || 3), '0'),
    UNIT: String(unitKode || 'GEN').toUpperCase(),
    MM: String(bulan).padStart(2, '0'),
    YYYY: String(tahun),
    YY: String(tahun).slice(-2),
    DD: String(hari).padStart(2, '0'),
  }
  const pattern = format || '{SEQ} / {UNIT} / {MM} / {YYYY}'
  return pattern.replace(/\{(SEQ|UNIT|MM|YYYY|YY|DD)\}/g, (_, key) => tokens[key])
}

/** Peek next number without incrementing counter */
export async function previewNomorSurat(unitKode, date = new Date()) {
  const db = useDb()
  const settings = await getSettingsMap()
  const tahun = date.getFullYear()
  const bulan = date.getMonth() + 1
  const kode = String(unitKode || 'GEN').slice(0, 20)

  const existing = await db.query.nomorCounter.findFirst({
    where: and(
      eq(nomorCounter.unitKode, kode),
      eq(nomorCounter.tahun, tahun),
      eq(nomorCounter.bulan, bulan),
    ),
  })

  const next = (existing?.counter || 0) + 1
  return {
    nomor: formatNomorSurat({
      format: settings.nomor_format,
      seq: next,
      seqPad: settings.nomor_seq_pad,
      unitKode: kode,
      date,
    }),
    nextSeq: next,
    counter: existing?.counter || 0,
    tahun,
    bulan,
    unitKode: kode,
    format: settings.nomor_format || '{SEQ} / {UNIT} / {MM} / {YYYY}',
  }
}

/** Format: default `{SEQ} / {UNIT} / {MM} / {YYYY}` — configurable via settings */
export async function generateNomorSurat(unitKode, date = new Date()) {
  const db = useDb()
  const settings = await getSettingsMap()
  const tahun = date.getFullYear()
  const bulan = date.getMonth() + 1
  const kode = String(unitKode || 'GEN').slice(0, 20)

  const existing = await db.query.nomorCounter.findFirst({
    where: and(
      eq(nomorCounter.unitKode, kode),
      eq(nomorCounter.tahun, tahun),
      eq(nomorCounter.bulan, bulan),
    ),
  })

  let counter

  if (existing) {
    const [updated] = await db
      .update(nomorCounter)
      .set({ counter: sql`${nomorCounter.counter} + 1` })
      .where(eq(nomorCounter.id, existing.id))
      .returning()
    counter = updated.counter
  }
  else {
    const [created] = await db
      .insert(nomorCounter)
      .values({ unitKode: kode, tahun, bulan, counter: 1 })
      .returning()
    counter = created.counter
  }

  return formatNomorSurat({
    format: settings.nomor_format,
    seq: counter,
    seqPad: settings.nomor_seq_pad,
    unitKode: kode,
    date,
  })
}

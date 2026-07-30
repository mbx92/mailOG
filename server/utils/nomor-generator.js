import { and, eq, sql } from 'drizzle-orm'
import { useDb } from '../db/index.js'
import { nomorCounter } from '../db/schema/index.js'

/** Format: XXX / UNIT-KODE / MM / YYYY */
export async function generateNomorSurat(unitKode, date = new Date()) {
  const db = useDb()
  const tahun = date.getFullYear()
  const bulan = date.getMonth() + 1

  const existing = await db.query.nomorCounter.findFirst({
    where: and(
      eq(nomorCounter.unitKode, unitKode),
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
      .values({ unitKode, tahun, bulan, counter: 1 })
      .returning()
    counter = created.counter
  }

  const seq = String(counter).padStart(3, '0')
  const mm = String(bulan).padStart(2, '0')
  return `${seq} / ${unitKode} / ${mm} / ${tahun}`
}

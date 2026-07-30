/**
 * Backfill notifikasi untuk disposisi pending (status=diterima) ke user di unit tujuan.
 * Usage: pnpm exec node --env-file=.env scripts/backfill-disposisi-notifications.js
 */
import { and, eq, isNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../server/db/schema/index.js'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mailog:mailog@localhost:5433/mailog'

async function main() {
  const client = postgres(DATABASE_URL, { max: 3 })
  const db = drizzle(client, { schema })

  const pending = await db
    .select()
    .from(schema.disposisi)
    .where(eq(schema.disposisi.status, 'diterima'))

  console.log('[backfill] pending disposisi:', pending.length)

  let notified = 0
  let skipped = 0

  for (const dsp of pending) {
    const recipients = new Set()

    if (dsp.keUserId) recipients.add(dsp.keUserId)
    else if (dsp.keUnitId) {
      const unitUsers = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.unitId, dsp.keUnitId),
            eq(schema.users.isActive, true),
            isNull(schema.users.deletedAt),
          ),
        )
      for (const u of unitUsers) {
        if (u.id !== dsp.dariUserId) recipients.add(u.id)
      }
    }

    if (!recipients.size) {
      skipped++
      continue
    }

    const surat = await db.query.suratMasuk.findFirst({
      where: eq(schema.suratMasuk.id, dsp.suratId),
      columns: { perihal: true },
    })

    for (const userId of recipients) {
      const existing = await db.query.notifikasi.findFirst({
        where: and(
          eq(schema.notifikasi.userId, userId),
          eq(schema.notifikasi.tipe, 'disposisi'),
          eq(schema.notifikasi.suratId, dsp.suratId),
          eq(schema.notifikasi.isRead, false),
        ),
        columns: { id: true },
      })
      if (existing) {
        skipped++
        continue
      }

      await db.insert(schema.notifikasi).values({
        userId,
        suratId: dsp.suratId,
        judul: 'Disposisi menunggu tindak lanjut',
        pesan: [
          surat?.perihal ? `Surat: ${surat.perihal}` : null,
          dsp.instruksi ? `Instruksi: ${dsp.instruksi}` : null,
        ]
          .filter(Boolean)
          .join('\n') || 'Ada disposisi pending untuk unit Anda',
        tipe: 'disposisi',
        isRead: false,
      })
      notified++
    }
  }

  console.log('[backfill] created:', notified, 'skipped:', skipped)
  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

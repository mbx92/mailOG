import { and, eq, inArray, isNull } from 'drizzle-orm'
import { useDb } from '../db/index.js'
import { notifikasi, users } from '../db/schema/index.js'

/**
 * Notify recipients of a new disposisi.
 * - If keUserId set → that user only
 * - Else if keUnitId set → all active users in that unit
 */
export async function notifyDisposisiReceived({
  disposisiId,
  suratId,
  keUserId,
  keUnitId,
  perihal,
  instruksi,
  dariNama,
  excludeUserId,
}) {
  const db = useDb()
  const recipients = new Set()

  if (keUserId) {
    recipients.add(keUserId)
  }
  else if (keUnitId) {
    const unitUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.unitId, keUnitId),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      )
    for (const u of unitUsers) recipients.add(u.id)
  }

  if (excludeUserId) recipients.delete(excludeUserId)
  if (!recipients.size) return { notified: 0 }

  const judul = 'Disposisi baru diterima'
  const pesan = [
    perihal ? `Surat: ${perihal}` : null,
    instruksi ? `Instruksi: ${instruksi}` : null,
    dariNama ? `Dari: ${dariNama}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const rows = [...recipients].map((userId) => ({
    userId,
    suratId: suratId || null,
    judul,
    pesan: pesan || 'Ada disposisi yang perlu ditindaklanjuti',
    tipe: 'disposisi',
    isRead: false,
  }))

  // avoid flooding duplicates for same user+surat+unread disposisi
  const existingWhere = [
    inArray(notifikasi.userId, [...recipients]),
    eq(notifikasi.tipe, 'disposisi'),
    eq(notifikasi.isRead, false),
  ]
  if (suratId) existingWhere.push(eq(notifikasi.suratId, suratId))

  const existing = await db
    .select({ userId: notifikasi.userId })
    .from(notifikasi)
    .where(and(...existingWhere))

  const already = new Set(existing.map((e) => e.userId))
  const toInsert = rows.filter((r) => !already.has(r.userId))
  if (!toInsert.length) return { notified: 0, disposisiId }

  await db.insert(notifikasi).values(toInsert)
  return { notified: toInsert.length, disposisiId }
}

export async function createNotification({
  userId,
  suratId = null,
  judul,
  pesan = null,
  tipe = 'info',
}) {
  const db = useDb()
  const [row] = await db
    .insert(notifikasi)
    .values({ userId, suratId, judul, pesan, tipe })
    .returning()
  return row
}

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { disposisi, suratMasuk } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'
import { notifyDisposisiReceived } from '../../utils/notifications.js'

const schema = z.object({
  suratId: z.string().uuid(),
  keUnitId: z.string().uuid().optional().nullable(),
  keUserId: z.string().uuid().optional().nullable(),
  instruksi: z.string().min(1).max(5000),
  batasWaktu: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'disposisi')

  const body = schema.parse(await readBody(event))
  if (!body.keUnitId && !body.keUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Pilih unit atau user tujuan disposisi',
    })
  }

  const db = useDb()
  const surat = await db.query.suratMasuk.findFirst({
    where: eq(suratMasuk.id, body.suratId),
    columns: { id: true, perihal: true, status: true, deletedAt: true },
  })
  if (!surat || surat.deletedAt) {
    throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  }

  const [row] = await db
    .insert(disposisi)
    .values({
      suratId: body.suratId,
      dariUserId: user.id,
      keUnitId: body.keUnitId || null,
      keUserId: body.keUserId || null,
      instruksi: body.instruksi,
      batasWaktu: body.batasWaktu || null,
      status: 'diterima',
    })
    .returning()

  // Masukkan surat ke inbox unit tujuan
  const suratPatch = {
    status: 'disposisi',
    updatedAt: new Date(),
  }
  if (body.keUnitId) suratPatch.tujuanUnitId = body.keUnitId

  await db
    .update(suratMasuk)
    .set(suratPatch)
    .where(eq(suratMasuk.id, body.suratId))

  await notifyDisposisiReceived({
    disposisiId: row.id,
    suratId: body.suratId,
    keUserId: body.keUserId,
    keUnitId: body.keUnitId,
    perihal: surat.perihal,
    instruksi: body.instruksi,
    dariNama: user.nama,
    excludeUserId: user.id,
  })

  await writeAuditLog({
    user,
    suratId: body.suratId,
    aksi: 'disposisi',
    detail: { disposisiId: row.id, keUnitId: body.keUnitId, keUserId: body.keUserId },
    event,
  })

  return { data: row }
})

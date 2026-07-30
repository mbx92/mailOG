import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../../db/index.js'
import { suratKeluar } from '../../../db/schema/index.js'
import { can, requireAuthUser } from '../../../utils/rbac.js'
import { writeAuditLog } from '../../../utils/audit.js'

const schema = z.object({
  catatan: z.string().max(2000).optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'approve_surat')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan reject' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const body = schema.parse(await readBody(event).catch(() => ({})))
  const db = useDb()

  const existing = await db.query.suratKeluar.findFirst({
    where: and(eq(suratKeluar.id, id), isNull(suratKeluar.deletedAt)),
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  if (existing.status !== 'menunggu_approval') {
    throw createError({ statusCode: 400, statusMessage: 'Surat tidak menunggu approval' })
  }

  const catatan = [
    existing.catatanInternal,
    body.catatan ? `[Ditolak] ${body.catatan}` : '[Ditolak]',
  ].filter(Boolean).join('\n')

  const [row] = await db
    .update(suratKeluar)
    .set({
      status: 'ditolak',
      catatanInternal: catatan,
      approvedBy: null,
      approvedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(suratKeluar.id, id))
    .returning()

  await writeAuditLog({
    user,
    suratId: id,
    aksi: 'reject',
    detail: { entity: 'surat_keluar', catatan: body.catatan },
    event,
  })

  return { data: row }
})

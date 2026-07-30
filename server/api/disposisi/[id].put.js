import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { disposisi } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  status: z.enum(['diterima', 'diproses', 'selesai', 'diteruskan']),
  instruksi: z.string().max(5000).optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'terima_disposisi')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const row = await db.query.disposisi.findFirst({
    where: eq(disposisi.id, id),
  })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Disposisi tidak ditemukan' })

  // Hanya unit/user tujuan yang menindaklanjuti (admin pantau saja)
  const mine =
    (user.unitId && row.keUnitId === user.unitId)
    || row.keUserId === user.id
  if (!mine) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Hanya unit tujuan yang dapat menindaklanjuti disposisi',
    })
  }

  const [updated] = await db
    .update(disposisi)
    .set({
      status: body.status,
      instruksi: body.instruksi !== undefined ? body.instruksi : row.instruksi,
      updatedAt: new Date(),
    })
    .where(eq(disposisi.id, id))
    .returning()

  await writeAuditLog({
    user,
    suratId: row.suratId,
    aksi: 'disposisi',
    detail: { disposisiId: id, status: body.status },
    event,
  })

  return { data: updated }
})

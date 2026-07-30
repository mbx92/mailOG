import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db/index.js'
import { unit } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  parentUnitId: z.string().uuid().optional().nullable(),
  kode: z.string().min(1).max(20).optional(),
  nama: z.string().min(1).max(255).optional(),
  kepalaUnitId: z.string().uuid().optional().nullable(),
  status: z.enum(['aktif', 'nonaktif']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'manage_unit')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const [row] = await db
    .update(unit)
    .set({
      ...body,
      kode: body.kode ? body.kode.toUpperCase() : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(unit.id, id), isNull(unit.deletedAt)))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Unit tidak ditemukan' })

  await writeAuditLog({
    user,
    aksi: 'edit',
    detail: { entity: 'unit', id },
    event,
  })

  return { data: row }
})

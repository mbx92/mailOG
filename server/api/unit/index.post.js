import { z } from 'zod'
import { useDb } from '../../db/index.js'
import { unit } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  instansiId: z.string().uuid(),
  parentUnitId: z.string().uuid().optional().nullable(),
  kode: z.string().min(1).max(20),
  nama: z.string().min(1).max(255),
  kepalaUnitId: z.string().uuid().optional().nullable(),
  status: z.enum(['aktif', 'nonaktif']).default('aktif'),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'manage_unit')

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const [row] = await db
    .insert(unit)
    .values({
      instansiId: body.instansiId,
      parentUnitId: body.parentUnitId ?? null,
      kode: body.kode.toUpperCase(),
      nama: body.nama,
      kepalaUnitId: body.kepalaUnitId ?? null,
      status: body.status,
    })
    .returning()

  await writeAuditLog({
    user,
    aksi: 'buat',
    detail: { entity: 'unit', id: row.id },
    event,
  })

  return { data: row }
})

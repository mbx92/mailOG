import { z } from 'zod'
import { useDb } from '../../db/index.js'
import { instansi } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  kode: z.string().min(1).max(20),
  nama: z.string().min(1).max(255),
  alamat: z.string().optional().nullable(),
  kontak: z.string().max(100).optional().nullable(),
  status: z.enum(['aktif', 'nonaktif']).default('aktif'),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'manage_instansi')

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const [row] = await db
    .insert(instansi)
    .values({
      kode: body.kode.toUpperCase(),
      nama: body.nama,
      alamat: body.alamat ?? null,
      kontak: body.kontak ?? null,
      status: body.status,
    })
    .returning()

  await writeAuditLog({
    user,
    aksi: 'buat',
    detail: { entity: 'instansi', id: row.id, kode: row.kode },
    event,
  })

  return { data: row }
})

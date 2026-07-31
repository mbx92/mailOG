import { z } from 'zod'
import { useDb } from '../../db/index.js'
import { klasifikasiSurat } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  nama: z.string().min(1).max(100),
  warna: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Warna harus hex #RRGGBB').default('#5f5f5f'),
  urutan: z.number().int().min(0).max(9999).default(0),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'manage_instansi')

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const [row] = await db
    .insert(klasifikasiSurat)
    .values({
      nama: body.nama.trim(),
      warna: body.warna.toLowerCase(),
      urutan: body.urutan,
    })
    .returning()

  await writeAuditLog({
    user,
    aksi: 'buat',
    detail: { entity: 'klasifikasi', id: row.id },
    event,
  })

  return { data: row }
})

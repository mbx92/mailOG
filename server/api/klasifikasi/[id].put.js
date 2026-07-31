import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db/index.js'
import { klasifikasiSurat } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  nama: z.string().min(1).max(100).optional(),
  warna: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Warna harus hex #RRGGBB').optional(),
  urutan: z.number().int().min(0).max(9999).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'manage_instansi')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const patch = {}
  if (body.nama != null) patch.nama = body.nama.trim()
  if (body.warna != null) patch.warna = body.warna.toLowerCase()
  if (body.urutan != null) patch.urutan = body.urutan

  if (!Object.keys(patch).length) {
    throw createError({ statusCode: 400, statusMessage: 'Tidak ada data diubah' })
  }

  const [row] = await db
    .update(klasifikasiSurat)
    .set(patch)
    .where(eq(klasifikasiSurat.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Klasifikasi tidak ditemukan' })

  await writeAuditLog({
    user,
    aksi: 'edit',
    detail: { entity: 'klasifikasi', id },
    event,
  })

  return { data: row }
})

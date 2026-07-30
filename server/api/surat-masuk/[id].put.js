import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db/index.js'
import { suratMasuk } from '../../db/schema/index.js'
import { can, requireAuthUser } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  nomorSurat: z.string().min(1).max(100).optional(),
  perihal: z.string().min(1).max(255).optional(),
  isiRingkasan: z.string().optional().nullable(),
  asalInstansiId: z.string().uuid().optional().nullable(),
  asalUnitId: z.string().uuid().optional().nullable(),
  pengirim: z.string().max(255).optional().nullable(),
  tanggalSurat: z.string().optional(),
  tanggalDiterima: z.string().optional(),
  tujuanUnitId: z.string().uuid().optional().nullable(),
  klasifikasiId: z.string().uuid().optional().nullable(),
  status: z.enum(['baru', 'diproses', 'disposisi', 'selesai', 'arsip']).optional(),
  catatanInternal: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'edit_surat_all') && !can(user.level, 'registrasi_surat')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak punya akses' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const [row] = await db
    .update(suratMasuk)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(suratMasuk.id, id), isNull(suratMasuk.deletedAt)))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })

  await writeAuditLog({
    user,
    suratId: id,
    aksi: body.status === 'arsip' ? 'arsip' : 'edit',
    detail: { entity: 'surat_masuk', status: body.status },
    event,
  })

  return { data: row }
})

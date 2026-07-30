import { z } from 'zod'
import { useDb } from '../../db/index.js'
import { suratMasuk } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  nomorSurat: z.string().min(1).max(100),
  perihal: z.string().min(1).max(255),
  isiRingkasan: z.string().optional().nullable(),
  asalInstansiId: z.string().uuid().optional().nullable(),
  asalUnitId: z.string().uuid().optional().nullable(),
  pengirim: z.string().max(255).optional().nullable(),
  tanggalSurat: z.string(),
  tanggalDiterima: z.string(),
  tujuanUnitId: z.string().uuid().optional().nullable(),
  klasifikasiId: z.string().uuid().optional().nullable(),
  status: z.enum(['baru', 'diproses', 'disposisi', 'selesai', 'arsip']).default('baru'),
  catatanInternal: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'registrasi_surat')

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const [row] = await db
    .insert(suratMasuk)
    .values({
      nomorSurat: body.nomorSurat,
      perihal: body.perihal,
      isiRingkasan: body.isiRingkasan ?? null,
      asalInstansiId: body.asalInstansiId ?? null,
      asalUnitId: body.asalUnitId ?? null,
      pengirim: body.pengirim ?? null,
      tanggalSurat: body.tanggalSurat,
      tanggalDiterima: body.tanggalDiterima,
      tujuanUnitId: body.tujuanUnitId ?? user.unitId,
      klasifikasiId: body.klasifikasiId ?? null,
      status: body.status,
      catatanInternal: body.catatanInternal ?? null,
      createdBy: user.id,
    })
    .returning()

  await writeAuditLog({
    user,
    suratId: row.id,
    aksi: 'buat',
    detail: { entity: 'surat_masuk', nomorSurat: row.nomorSurat },
    event,
  })

  return { data: row }
})

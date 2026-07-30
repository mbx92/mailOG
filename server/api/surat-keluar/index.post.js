import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { suratKeluar, unit } from '../../db/schema/index.js'
import { can, requireAuthUser } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'
import { generateNomorSurat } from '../../utils/nomor-generator.js'

const schema = z.object({
  perihal: z.string().min(1).max(255),
  isiSurat: z.string().optional().nullable(),
  tujuanInstansiId: z.string().uuid().optional().nullable(),
  tujuanUnitId: z.string().uuid().optional().nullable(),
  penerima: z.string().max(255).optional().nullable(),
  penerimaJabatan: z.string().max(100).optional().nullable(),
  penerimaAlamat: z.string().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
  tanggalSurat: z.string().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  klasifikasiId: z.string().uuid().optional().nullable(),
  catatanInternal: z.string().optional().nullable(),
  /** draft | submit (langsung ajukan approval) */
  action: z.enum(['draft', 'submit']).optional().default('draft'),
  nomorSurat: z.string().max(100).optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const unitId = body.unitId || user.unitId || null
  let unitKode = 'GEN'
  if (unitId) {
    const u = await db.query.unit.findFirst({
      where: and(eq(unit.id, unitId), isNull(unit.deletedAt)),
      columns: { kode: true },
    })
    if (u?.kode) unitKode = String(u.kode).slice(0, 20)
  }

  const tanggal = body.tanggalSurat || new Date().toISOString().slice(0, 10)
  const submit = body.action === 'submit'
  let nomorSurat = body.nomorSurat?.trim() || null
  if (submit && !nomorSurat) {
    nomorSurat = await generateNomorSurat(unitKode, new Date(tanggal))
  }

  const [row] = await db
    .insert(suratKeluar)
    .values({
      nomorSurat,
      perihal: body.perihal,
      isiSurat: body.isiSurat ?? null,
      tujuanInstansiId: body.tujuanInstansiId ?? null,
      tujuanUnitId: body.tujuanUnitId ?? null,
      penerima: body.penerima ?? null,
      penerimaJabatan: body.penerimaJabatan ?? null,
      penerimaAlamat: body.penerimaAlamat ?? null,
      templateId: body.templateId ?? null,
      tanggalSurat: tanggal,
      unitId,
      klasifikasiId: body.klasifikasiId ?? null,
      status: submit ? 'menunggu_approval' : 'draft',
      catatanInternal: body.catatanInternal ?? null,
      createdBy: user.id,
    })
    .returning()

  await writeAuditLog({
    user,
    suratId: row.id,
    aksi: 'buat',
    detail: { entity: 'surat_keluar', status: row.status, nomorSurat: row.nomorSurat },
    event,
  })

  return { data: row }
})

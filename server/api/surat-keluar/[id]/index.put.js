import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../../db/index.js'
import { suratKeluar, unit } from '../../../db/schema/index.js'
import { can, requireAuthUser } from '../../../utils/rbac.js'
import { writeAuditLog } from '../../../utils/audit.js'
import { generateNomorSurat } from '../../../utils/nomor-generator.js'

const schema = z.object({
  perihal: z.string().min(1).max(255).optional(),
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
  nomorSurat: z.string().max(100).optional().nullable(),
  action: z.enum(['draft', 'submit']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const existing = await db.query.suratKeluar.findFirst({
    where: and(eq(suratKeluar.id, id), isNull(suratKeluar.deletedAt)),
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })

  const editable = ['draft', 'ditolak'].includes(existing.status)
  if (!editable) {
    throw createError({ statusCode: 400, statusMessage: 'Surat tidak dapat diedit pada status ini' })
  }

  const patch = { updatedAt: new Date() }
  for (const key of [
    'perihal', 'isiSurat', 'tujuanInstansiId', 'tujuanUnitId', 'penerima',
    'penerimaJabatan', 'penerimaAlamat', 'templateId', 'tanggalSurat',
    'unitId', 'klasifikasiId', 'catatanInternal', 'nomorSurat',
  ]) {
    if (body[key] !== undefined) patch[key] = body[key]
  }

  if (body.action === 'submit') {
    const unitId = patch.unitId || existing.unitId || user.unitId
    let unitKode = 'GEN'
    if (unitId) {
      const u = await db.query.unit.findFirst({
        where: and(eq(unit.id, unitId), isNull(unit.deletedAt)),
        columns: { kode: true },
      })
      if (u?.kode) unitKode = String(u.kode).slice(0, 20)
    }
    const tanggal = patch.tanggalSurat || existing.tanggalSurat || new Date().toISOString().slice(0, 10)
    if (!patch.nomorSurat && !existing.nomorSurat) {
      patch.nomorSurat = await generateNomorSurat(unitKode, new Date(tanggal))
    }
    patch.status = 'menunggu_approval'
  }
  else if (existing.status === 'ditolak') {
    patch.status = 'draft'
  }

  const [row] = await db
    .update(suratKeluar)
    .set(patch)
    .where(eq(suratKeluar.id, id))
    .returning()

  await writeAuditLog({
    user,
    suratId: id,
    aksi: body.action === 'submit' ? 'kirim' : 'edit',
    detail: { entity: 'surat_keluar', status: row.status },
    event,
  })

  return { data: row }
})

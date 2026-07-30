import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../../db/index.js'
import { suratKeluar, lampiran } from '../../../db/schema/index.js'
import { can, requireAuthUser } from '../../../utils/rbac.js'
import { writeAuditLog } from '../../../utils/audit.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat') && !can(user.level, 'lihat_all')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const db = useDb()
  const row = await db.query.suratKeluar.findFirst({
    where: and(eq(suratKeluar.id, id), isNull(suratKeluar.deletedAt)),
    with: {
      tujuanInstansi: true,
      tujuanUnit: true,
      unit: true,
      klasifikasi: true,
      template: true,
      creator: { columns: { id: true, nama: true, email: true, jabatan: true } },
    },
  })

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })

  const files = await db.query.lampiran.findMany({
    where: and(eq(lampiran.suratId, id), eq(lampiran.jenis, 'keluar')),
  })

  await writeAuditLog({
    user,
    suratId: id,
    aksi: 'baca',
    detail: { entity: 'surat_keluar' },
    event,
  })

  return {
    data: {
      ...row,
      lampiran: files,
    },
  }
})

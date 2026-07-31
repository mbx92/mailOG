import { eq, sql } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { klasifikasiSurat, suratKeluar, suratMasuk } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'manage_instansi')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const db = useDb()

  const [{ count: masukCount }] = await db
    .select({ count: sql`count(*)::int` })
    .from(suratMasuk)
    .where(eq(suratMasuk.klasifikasiId, id))

  const [{ count: keluarCount }] = await db
    .select({ count: sql`count(*)::int` })
    .from(suratKeluar)
    .where(eq(suratKeluar.klasifikasiId, id))

  if ((masukCount || 0) + (keluarCount || 0) > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Klasifikasi masih dipakai di surat, tidak bisa dihapus',
    })
  }

  const [row] = await db
    .delete(klasifikasiSurat)
    .where(eq(klasifikasiSurat.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Klasifikasi tidak ditemukan' })

  await writeAuditLog({
    user,
    aksi: 'hapus',
    detail: { entity: 'klasifikasi', id },
    event,
  })

  return { ok: true }
})

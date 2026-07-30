import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { suratMasuk } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'hapus_surat')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const db = useDb()
  const [row] = await db
    .update(suratMasuk)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(suratMasuk.id, id), isNull(suratMasuk.deletedAt)))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })

  await writeAuditLog({
    user,
    suratId: id,
    aksi: 'hapus',
    detail: { entity: 'surat_masuk' },
    event,
  })

  return { ok: true }
})

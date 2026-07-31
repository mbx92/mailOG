import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../../db/index.js'
import { templateSurat } from '../../../db/schema/index.js'
import { can, requireAuthUser } from '../../../utils/rbac.js'
import { writeAuditLog } from '../../../utils/audit.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const db = useDb()
  const [row] = await db
    .update(templateSurat)
    .set({ deletedAt: new Date(), updatedAt: new Date(), isDefault: false })
    .where(and(eq(templateSurat.id, id), isNull(templateSurat.deletedAt)))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Template tidak ditemukan' })

  await writeAuditLog({
    user,
    aksi: 'hapus',
    detail: { entity: 'template_surat', id },
    event,
  })

  return { data: { ok: true } }
})

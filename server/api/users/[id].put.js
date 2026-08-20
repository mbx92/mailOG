import { and, eq, isNull, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db/index.js'
import { users, USER_LEVELS } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  nama: z.string().min(1).max(255).optional(),
  level: z.number().int().min(1).max(5).optional(),
  unitId: z.string().uuid().optional().nullable(),
  jabatan: z.string().max(100).optional().nullable(),
  noTelp: z.string().max(20).optional().nullable(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const actor = await requireAuthUser(event)
  requirePermission(actor, 'manage_user')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const existing = await db.query.users.findFirst({
    where: and(eq(users.id, id), isNull(users.deletedAt)),
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'User tidak ditemukan' })

  const patch = { updatedAt: new Date() }
  if (body.nama != null) patch.nama = body.nama.trim()
  if (body.level != null) patch.level = body.level
  if (body.unitId !== undefined) patch.unitId = body.unitId
  if (body.jabatan !== undefined) patch.jabatan = body.jabatan
  if (body.noTelp !== undefined) patch.noTelp = body.noTelp
  if (body.isActive != null) patch.isActive = body.isActive

  if (Object.keys(patch).length === 1) {
    throw createError({ statusCode: 400, statusMessage: 'Tidak ada data diubah' })
  }

  const nextLevel = patch.level ?? existing.level
  const nextActive = patch.isActive ?? existing.isActive
  const losingSuperAdmin = existing.level === USER_LEVELS.SUPER_ADMIN
    && (nextLevel !== USER_LEVELS.SUPER_ADMIN || nextActive === false)

  if (losingSuperAdmin) {
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(users)
      .where(and(
        eq(users.level, USER_LEVELS.SUPER_ADMIN),
        eq(users.isActive, true),
        isNull(users.deletedAt),
        ne(users.id, id),
      ))
    if (!count) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tidak dapat mengubah role Super Admin terakhir',
      })
    }
  }

  const [row] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, id))
    .returning()

  await writeAuditLog({
    user: actor,
    aksi: 'edit',
    detail: { entity: 'user', id, level: row.level },
    event,
  })

  const { password: _, ...safe } = row
  return { data: safe }
})

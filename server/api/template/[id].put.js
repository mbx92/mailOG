import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { templateSurat } from '../../db/schema/index.js'
import { can, requireAuthUser } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  nama: z.string().min(1).max(255).optional(),
  kode: z.string().min(1).max(50).optional(),
  kopSurat: z.string().optional().nullable(),
  bodyTemplate: z.string().optional().nullable(),
  footer: z.string().optional().nullable(),
  kertas: z.enum(['a4', 'folio', 'legal']).optional(),
  margin: z
    .object({
      top: z.number().optional(),
      right: z.number().optional(),
      bottom: z.number().optional(),
      left: z.number().optional(),
    })
    .optional()
    .nullable(),
  unitId: z.string().uuid().optional().nullable(),
  isDefault: z.boolean().optional(),
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

  if (body.isDefault === true) {
    await db.update(templateSurat).set({ isDefault: false, updatedAt: new Date() })
  }

  const patch = { ...body, updatedAt: new Date() }
  if (body.kode) patch.kode = body.kode.trim().toUpperCase()

  const [row] = await db
    .update(templateSurat)
    .set(patch)
    .where(and(eq(templateSurat.id, id), isNull(templateSurat.deletedAt)))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Template tidak ditemukan' })

  await writeAuditLog({
    user,
    aksi: 'edit',
    detail: { entity: 'template_surat', id },
    event,
  })

  return { data: row }
})

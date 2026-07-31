import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { templateSurat } from '../../db/schema/index.js'
import { can, requireAuthUser } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  nama: z.string().min(1).max(255),
  kode: z.string().min(1).max(50),
  kopSurat: z.string().optional().nullable(),
  kopImage: z.string().max(255).optional().nullable(),
  bodyTemplate: z.string().optional().nullable(),
  footer: z.string().optional().nullable(),
  footerImage: z.string().max(255).optional().nullable(),
  kertas: z.enum(['a4', 'folio', 'legal']).default('a4'),
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
  isDefault: z.boolean().optional().default(false),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const body = schema.parse(await readBody(event))
  const db = useDb()

  if (body.isDefault) {
    await db.update(templateSurat).set({ isDefault: false, updatedAt: new Date() })
  }

  const [row] = await db
    .insert(templateSurat)
    .values({
      nama: body.nama,
      kode: body.kode.trim().toUpperCase(),
      kopSurat: body.kopSurat ?? null,
      kopImage: body.kopImage ?? null,
      bodyTemplate: body.bodyTemplate ?? null,
      footer: body.footer ?? null,
      footerImage: body.footerImage ?? null,
      kertas: body.kertas,
      margin: body.margin ?? { top: 20, right: 20, bottom: 20, left: 25 },
      unitId: body.unitId ?? null,
      isDefault: body.isDefault ?? false,
    })
    .returning()

  await writeAuditLog({
    user,
    aksi: 'buat',
    detail: { entity: 'template_surat', id: row.id, kode: row.kode },
    event,
  })

  return { data: row }
})

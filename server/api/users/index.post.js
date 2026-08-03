import { hash } from 'bcryptjs'
import { z } from 'zod'
import { useDb } from '../../db/index.js'
import { users, USER_PROVIDERS } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  nama: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  level: z.number().int().min(1).max(5),
  unitId: z.string().uuid().optional().nullable(),
  jabatan: z.string().max(100).optional().nullable(),
  noTelp: z.string().max(20).optional().nullable(),
  isActive: z.boolean().default(true),
})

export default defineEventHandler(async (event) => {
  const actor = await requireAuthUser(event)
  requirePermission(actor, 'manage_user')

  const body = schema.parse(await readBody(event))
  const db = useDb()
  const passwordHash = await hash(body.password, 12)

  const [row] = await db
    .insert(users)
    .values({
      nama: body.nama,
      email: body.email.toLowerCase().trim(),
      password: passwordHash,
      level: body.level,
      unitId: body.unitId ?? null,
      jabatan: body.jabatan ?? null,
      noTelp: body.noTelp ?? null,
      provider: USER_PROVIDERS.LOCAL,
      isActive: body.isActive,
    })
    .returning()

  await writeAuditLog({
    user: actor,
    aksi: 'buat',
    detail: { entity: 'user', id: row.id },
    event,
  })

  const { password: _, ...safe } = row
  return { data: safe }
})

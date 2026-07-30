import { eq, and, isNull } from 'drizzle-orm'
import { compare } from 'bcryptjs'
import { useDb } from '../../db/index.js'
import { users } from '../../db/schema/index.js'
import { writeAuditLog } from '../../utils/audit.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.email || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: 'Email dan password wajib diisi' })
  }

  const db = useDb()
  const user = await db.query.users.findFirst({
    where: and(eq(users.email, body.email.toLowerCase().trim()), isNull(users.deletedAt)),
  })

  if (!user || !user.isActive) {
    throw createError({ statusCode: 401, statusMessage: 'Email atau password salah' })
  }

  const valid = await compare(body.password, user.password)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Email atau password salah' })
  }

  await db
    .update(users)
    .set({ lastLogin: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id))

  const sessionUser = {
    id: user.id,
    email: user.email,
    nama: user.nama,
    level: user.level,
    unitId: user.unitId,
    jabatan: user.jabatan,
  }

  await setUserSession(event, { user: sessionUser })

  await writeAuditLog({
    user: sessionUser,
    aksi: 'login',
    detail: { email: user.email },
    event,
  })

  return { user: sessionUser }
})

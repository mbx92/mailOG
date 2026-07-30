import { eq, and, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { users, USER_LEVEL_LABELS } from '../../db/schema/index.js'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = useDb()
  const user = await db.query.users.findFirst({
    where: and(eq(users.id, session.user.id), isNull(users.deletedAt)),
    with: { unit: true },
  })

  if (!user) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      nama: user.nama,
      level: user.level,
      levelLabel: USER_LEVEL_LABELS[user.level] || 'Unknown',
      unitId: user.unitId,
      unit: user.unit
        ? { id: user.unit.id, nama: user.unit.nama, kode: user.unit.kode }
        : null,
      jabatan: user.jabatan,
      avatar: user.avatar,
    },
  }
})

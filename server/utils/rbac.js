import { and, eq, isNull } from 'drizzle-orm'
import { USER_LEVELS } from '../db/schema/users.js'
import { users } from '../db/schema/index.js'
import { useDb } from '../db/index.js'

const MATRIX = {
  manage_user: [USER_LEVELS.SUPER_ADMIN],
  manage_instansi: [USER_LEVELS.SUPER_ADMIN, USER_LEVELS.ADMIN],
  manage_unit: [USER_LEVELS.SUPER_ADMIN, USER_LEVELS.ADMIN],
  buat_surat: [USER_LEVELS.SUPER_ADMIN, USER_LEVELS.DIREKSI, USER_LEVELS.ADMIN],
  edit_surat_own: [USER_LEVELS.SUPER_ADMIN, USER_LEVELS.DIREKSI, USER_LEVELS.ADMIN],
  edit_surat_all: [USER_LEVELS.SUPER_ADMIN, USER_LEVELS.ADMIN],
  hapus_surat: [USER_LEVELS.SUPER_ADMIN],
  approve_surat: [USER_LEVELS.SUPER_ADMIN, USER_LEVELS.DIREKSI, USER_LEVELS.ADMIN],
  disposisi: [USER_LEVELS.SUPER_ADMIN, USER_LEVELS.DIREKSI, USER_LEVELS.ADMIN],
  registrasi_surat: [USER_LEVELS.SUPER_ADMIN, USER_LEVELS.DIREKSI, USER_LEVELS.ADMIN],
  terima_disposisi: [
    USER_LEVELS.SUPER_ADMIN,
    USER_LEVELS.DIREKSI,
    USER_LEVELS.ADMIN,
    USER_LEVELS.STAFF,
  ],
  lihat_unit: [
    USER_LEVELS.SUPER_ADMIN,
    USER_LEVELS.DIREKSI,
    USER_LEVELS.ADMIN,
    USER_LEVELS.STAFF,
    USER_LEVELS.VIEWER,
  ],
  lihat_all: [USER_LEVELS.SUPER_ADMIN, USER_LEVELS.DIREKSI],
  tracking: [
    USER_LEVELS.SUPER_ADMIN,
    USER_LEVELS.DIREKSI,
    USER_LEVELS.ADMIN,
    USER_LEVELS.STAFF,
  ],
  export: [
    USER_LEVELS.SUPER_ADMIN,
    USER_LEVELS.DIREKSI,
    USER_LEVELS.ADMIN,
    USER_LEVELS.STAFF,
  ],
  audit: [USER_LEVELS.SUPER_ADMIN],
  pengaturan: [USER_LEVELS.SUPER_ADMIN],
}

export function can(level, permission) {
  return MATRIX[permission]?.includes(level) ?? false
}

export function requirePermission(user, permission) {
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (!can(user.level, permission)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}

export async function requireAuthUser(event) {
  const session = await getUserSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Session may outlive users wiped by migrate/seed — re-check DB
  const db = useDb()
  const row = await db.query.users.findFirst({
    where: and(eq(users.id, session.user.id), isNull(users.deletedAt)),
    columns: {
      id: true,
      email: true,
      nama: true,
      level: true,
      unitId: true,
      jabatan: true,
      isActive: true,
    },
  })

  if (!row?.isActive) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return {
    id: row.id,
    email: row.email,
    nama: row.nama,
    level: row.level,
    unitId: row.unitId,
    jabatan: row.jabatan,
  }
}

import { eq, and, isNull } from 'drizzle-orm'
import { hash } from 'bcryptjs'
import { createError, useSession } from 'h3'
import { useDb } from '../db/index.js'
import { users, unit, USER_PROVIDERS } from '../db/schema/index.js'
import { writeAuditLog } from '../utils/audit.js'

/**
 * Match nuxt-auth-utils cookie (name: nuxt-session).
 * Avoid #imports — this file may load outside Nitro's transform pipeline.
 */
async function setMailogSession(event, data) {
  const password =
    process.env.NUXT_SESSION_PASSWORD ||
    process.env.SESSION_SECRET ||
    ''
  if (!password || password.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_SESSION_PASSWORD belum dikonfigurasi (min 32 karakter)',
    })
  }

  const session = await useSession(event, {
    name: 'nuxt-session',
    password,
    cookie: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      path: '/',
    },
  })

  await session.update({
    ...session.data,
    ...data,
    user: {
      ...(session.data?.user || {}),
      ...(data.user || {}),
    },
  })

  return session.data
}

/**
 * Map SSO userinfo → MailOG session.
 * Dipanggil oleh @mbx92/nuxt-sso-client setelah token exchange.
 */
export default async function resolveSsoUser(event, { userInfo, tokens, sso }) {
  const email = String(userInfo.email || '').toLowerCase().trim()
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'SSO tidak mengembalikan email' })
  }

  try {
    const db = useDb()

    // Resolve local unit from SSO unit_name or unit_code
    let localUnitId = null
    let localUnitName = userInfo.unit_name || null
    if (userInfo.unit_name || userInfo.unit_code) {
      let matchedUnit = null
      if (userInfo.unit_name) {
        ;[matchedUnit] = await db
          .select({ id: unit.id, nama: unit.nama })
          .from(unit)
          .where(eq(unit.nama, String(userInfo.unit_name).trim()))
          .limit(1)
      }
      if (!matchedUnit && userInfo.unit_code) {
        ;[matchedUnit] = await db
          .select({ id: unit.id, nama: unit.nama })
          .from(unit)
          .where(eq(unit.kode, String(userInfo.unit_code).trim()))
          .limit(1)
      }
      if (matchedUnit) {
        localUnitId = matchedUnit.id
        localUnitName = matchedUnit.nama
      }
    }

    let user = await db.query.users.findFirst({
      where: and(eq(users.email, email), isNull(users.deletedAt)),
    })

    if (!user && sso.autoProvision) {
      const randomPassword = await hash(crypto.randomUUID(), 12)
      const isSuper = userInfo.role_name === 'superadmin'
      ;[user] = await db
        .insert(users)
        .values({
          nama: userInfo.name || email,
          email,
          password: randomPassword,
          level: isSuper ? 1 : 4,
          unitId: localUnitId,
          jabatan: userInfo.position || (isSuper ? 'SSO Superadmin' : 'SSO User'),
          provider: USER_PROVIDERS.SSO,
          isActive: true,
        })
        .returning()
    }

    // If user exists but has no unitId yet, backfill from SSO
    if (user && !user.unitId && localUnitId) {
      await db
        .update(users)
        .set({ unitId: localUnitId, updatedAt: new Date() })
        .where(eq(users.id, user.id))
      user.unitId = localUnitId
    }

    if (!user || !user.isActive) {
      throw createError({
        statusCode: 403,
        statusMessage: `User ${email} belum terdaftar di MailOG`,
      })
    }

    await db
      .update(users)
      .set({
        lastLogin: new Date(),
        updatedAt: new Date(),
        nama: userInfo.name || user.nama,
        provider: USER_PROVIDERS.SSO,
      })
      .where(eq(users.id, user.id))

    const sessionUser = {
      id: user.id,
      email: user.email,
      nama: userInfo.name || user.nama,
      level: user.level,
      unitId: user.unitId || localUnitId,
      unitName: localUnitName,
      jabatan: user.jabatan,
      provider: USER_PROVIDERS.SSO,
    }

    await setMailogSession(event, {
      user: sessionUser,
    })

    await writeAuditLog({
      user: sessionUser,
      aksi: 'login',
      detail: { email: user.email, provider: 'sso' },
      event,
    })

    return { redirectTo: '/' }
  }
  catch (error) {
    if (error?.statusCode && error?.statusMessage && error.statusCode < 500) {
      throw error
    }
    const { throwHumanError } = await import('../utils/humanize-error.js')
    throwHumanError(error, {
      statusCode: 500,
      fallback: 'Login SSO gagal. Silakan coba lagi atau hubungi administrator.',
    })
  }
}

import { defineEventHandler, useSession } from 'h3'
import { $fetch } from 'ofetch'

function getSessionPassword() {
  return process.env.NUXT_SESSION_PASSWORD || process.env.SESSION_SECRET || ''
}

/**
 * Validates that the current SSO user still has active sessions
 * on the SSO issuer. If admin revoked the session, there will be
 * no AccessToken rows in oidc_kv for this user → { valid: false }.
 */
export default defineEventHandler(async (event) => {
  try {
    const password = getSessionPassword()
    if (!password) {
      return { valid: true }
    }

    const session = await useSession(event, {
      name: 'nuxt-session',
      password,
    })

    const userId = session.data?.user?.id
    if (!userId) {
      return { valid: true } // not logged in, no check needed
    }

    const issuer = process.env.SSO_ISSUER || 'http://localhost:3010'

    const result = await $fetch(`${issuer}/api/auth/check-session`, {
      method: 'POST',
      body: { userId },
      headers: { 'Content-Type': 'application/json' },
      ignoreResponseError: true,
    })

    const valid = result?.valid === true

    if (!valid) {
      await session.clear()
    }

    return { valid }
  }
  catch (error) {
    console.error('[mailOG] SSO session check error:', error.message)
    return { valid: true }
  }
})

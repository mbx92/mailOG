let _lastSsoCheck = 0
const SSO_CHECK_INTERVAL = 30_000

export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, user, clear, fetch: fetchSession } = useUserSession()
  const isAuthPage = to.path === '/login'

  await fetchSession()

  if (!loggedIn.value && !isAuthPage) {
    return navigateTo('/login')
  }

  if (loggedIn.value && isAuthPage) {
    return navigateTo('/')
  }

  // Only check SSO validity on the client — SSR $fetch does not
  // forward the nuxt-session cookie to Nitro internally.
  if (import.meta.client && user.value?.provider === 'sso') {
    const now = Date.now()
    if (now - _lastSsoCheck > SSO_CHECK_INTERVAL) {
      _lastSsoCheck = now
      try {
        const result = await $fetch('/api/auth/check-sso-session', { credentials: 'include' })
        if (!result?.valid) {
          await clear()
          return navigateTo('/login?reason=session_expired')
        }
      }
      catch (err) {
        // transient error — retry next navigation
      }
    }
  }
})

export function useAuth() {
  const { loggedIn, user, clear, fetch: fetchSession } = useUserSession()
  const runtimeConfig = useRuntimeConfig()

  const login = async (email, password) => {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    await fetchSession()
  }

  const logout = async () => {
    const isSso = user.value?.provider === 'sso'
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()

    if (isSso) {
      // Redirect to SSO portal (apps) — auto-detect from current URL origin
      const origin = window.location.origin
      // If origin contains localhost/127, resolve SSO from env; otherwise same IP port 3010
      let ssoBase
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        ssoBase = runtimeConfig.public?.ssoIssuer || 'http://localhost:3010'
      } else {
        // Strip port 3000 → replace with 3010 for SSO on same host
        ssoBase = origin.replace(/:3000/, ':3010')
      }
      window.location.replace(`${ssoBase}/apps`)
    } else {
      await navigateTo('/login')
    }
  }

  return {
    loggedIn,
    user,
    login,
    logout,
    fetchSession,
  }
}

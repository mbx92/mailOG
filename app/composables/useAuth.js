export function useAuth() {
  const { loggedIn, user, clear, fetch: fetchSession } = useUserSession()
  const { enabled: ssoEnabled, logoutFromSso } = useSso()

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

    // logoutFromSso() clears the SSO session on the issuer too — just
    // navigating to the issuer's app launcher (previous behavior) left that
    // session alive, so the next SSO login silently skipped the password
    // prompt instead of actually logging back in.
    if (isSso && ssoEnabled.value) {
      logoutFromSso()
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

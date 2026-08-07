export function useAuth() {
  const { loggedIn, user, clear, fetch: fetchSession } = useUserSession()
  const { enabled: ssoEnabled } = useSso()

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

    if (isSso && ssoEnabled.value) {
      // Redirect ke portal SSO — jangan panggil logoutFromSso()
      // karena akan menghancurkan session SSO di issuer
      const config = useRuntimeConfig()
      const issuer = config.public?.ssoIssuer || ''
      if (import.meta.client && issuer) {
        window.location.href = issuer.replace(/\/$/, '') + '/apps'
      } else {
        await navigateTo('/login')
      }
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

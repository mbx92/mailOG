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
      // Gunakan runtimeConfig untuk base URL SSO
      const ssoBase = runtimeConfig.public?.ssoIssuer
      if (ssoBase) {
        window.location.replace(`${ssoBase}/apps`)
      } else {
        // Fallback: redirect ke halaman login
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

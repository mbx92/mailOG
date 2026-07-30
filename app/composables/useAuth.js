export function useAuth() {
  const { loggedIn, user, clear, fetch: fetchSession } = useUserSession()

  const login = async (email, password) => {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    await fetchSession()
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    await navigateTo('/login')
  }

  return {
    loggedIn,
    user,
    login,
    logout,
    fetchSession,
  }
}

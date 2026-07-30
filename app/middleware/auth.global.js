export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, fetch: fetchSession } = useUserSession()

  await fetchSession()

  const isAuthPage = to.path === '/login'

  if (!loggedIn.value && !isAuthPage) {
    return navigateTo('/login')
  }

  if (loggedIn.value && isAuthPage) {
    return navigateTo('/')
  }
})

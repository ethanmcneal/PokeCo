// Route guard for protected pages: redirect to /login when there is no session.
// Applied per-page via definePageMeta({ middleware: 'auth' }).
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})

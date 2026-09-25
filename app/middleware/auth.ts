// Route guard for protected pages: redirect to /login (remembering where the
// user was headed) when there is no session. Applied per-page via
// definePageMeta({ middleware: 'auth' }).
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})

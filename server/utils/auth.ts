import type { H3Event } from 'h3'
import type { User } from '#auth-utils'

// Auth guard for protected routes. Wraps nuxt-auth-utils' requireUserSession
// (which throws 401 when there is no session) and returns the session user, so
// handlers get the user directly. Used by the collection routes in Phase 5.
export async function requireUser(event: H3Event): Promise<User> {
  const { user } = await requireUserSession(event)
  return user
}

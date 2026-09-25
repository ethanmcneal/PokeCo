import type { PublicUser } from '../../../shared/types'
import { findUserByEmail } from '../../repositories/user.repository'
import { rateLimit, rateLimitBypassed } from '../../utils/rate-limit'
import { credentialsSchema } from '../../utils/validation'

// A real password hash of a throwaway value, computed once. When the email has
// no account we still verify the submitted password against this decoy, so the
// scrypt work — and therefore the response time — is the same whether or not the
// account exists. Without it, the generic 401 still leaks account existence
// through a timing side-channel (unknown email skips the slow hash), which would
// defeat the anti-enumeration message below. See specs/07-security.md.
let decoyHashPromise: Promise<string> | undefined
function getDecoyHash(): Promise<string> {
  return (decoyHashPromise ??= hashPassword('decoy-not-a-real-password'))
}

// POST /api/auth/login (specs/04-api-contract.md, AC-4.2).
export default defineEventHandler(async (event): Promise<PublicUser> => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!rateLimitBypassed() && !rateLimit(`login:${ip}`, 10, 60_000).allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Too many attempts. Please try again later.',
    })
  }

  const parsed = credentialsSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Invalid credentials',
    })
  }
  const { email, password } = parsed.data

  const user = await findUserByEmail(email)
  // Always run a verification, against the decoy hash when there is no account,
  // so response time doesn't reveal whether the email exists. Computed before
  // the `!user` check so the slow hash can't be short-circuited away.
  const passwordOk = await verifyPassword(user?.passwordHash ?? (await getDecoyHash()), password)
  // One generic message for "no such user" and "wrong password" avoids account
  // enumeration (07-security).
  if (!user || !passwordOk) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid email or password.',
    })
  }

  await setUserSession(event, { user: { id: user.id, email: user.email } })
  return { id: user.id, email: user.email }
})

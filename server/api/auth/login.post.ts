import type { PublicUser } from '../../../shared/types'
import { findUserByEmail } from '../../repositories/user.repository'
import { rateLimit } from '../../utils/rate-limit'
import { credentialsSchema } from '../../utils/validation'

// POST /api/auth/login (specs/04-api-contract.md, AC-4.2).
export default defineEventHandler(async (event): Promise<PublicUser> => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!rateLimit(`login:${ip}`, 10, 60_000).allowed) {
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
  // One generic message for "no such user" and "wrong password" avoids account
  // enumeration (07-security).
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid email or password.',
    })
  }

  await setUserSession(event, { user: { id: user.id, email: user.email } })
  return { id: user.id, email: user.email }
})

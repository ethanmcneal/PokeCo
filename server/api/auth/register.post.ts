import type { PublicUser } from '../../../shared/types'
import { createUser, findUserByEmail } from '../../repositories/user.repository'
import { isUniqueConstraintError } from '../../utils/errors'
import { rateLimit } from '../../utils/rate-limit'
import { credentialsSchema } from '../../utils/validation'

// POST /api/auth/register (specs/04-api-contract.md, AC-4.1).
export default defineEventHandler(async (event): Promise<PublicUser> => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!rateLimit(`register:${ip}`, 5, 60_000).allowed) {
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
      message: parsed.error.issues[0]?.message ?? 'Invalid credentials',
    })
  }
  const { email, password } = parsed.data

  if (await findUserByEmail(email)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'An account with this email already exists.',
    })
  }

  const passwordHash = await hashPassword(password)

  let user
  try {
    user = await createUser({ email, passwordHash })
  } catch (err) {
    // Concurrent registration of the same email: the unique constraint is the
    // authoritative guard behind the check above.
    if (isUniqueConstraintError(err)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: 'An account with this email already exists.',
      })
    }
    throw err
  }

  await setUserSession(event, { user: { id: user.id, email: user.email } })
  setResponseStatus(event, 201)
  return { id: user.id, email: user.email }
})

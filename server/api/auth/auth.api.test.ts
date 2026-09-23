import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createUser, findUserByEmail } from '../../repositories/user.repository'
import { resetRateLimits } from '../../utils/rate-limit'
import loginHandler from './login.post'
import logoutHandler from './logout.post'
import registerHandler from './register.post'

// Drive the real auth handlers with the repository mocked and framework plumbing
// faked (server-globals). Covers register/login/logout, generic auth errors, and
// duplicate handling. (Vitest hoists vi.mock above the imports.)
vi.mock('../../repositories/user.repository', () => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
}))

interface MockEvent {
  body?: unknown
  session?: { user?: unknown } | null
  statusCode?: number
  ip?: string
}
const register = registerHandler as unknown as (event: MockEvent) => Promise<unknown>
const login = loginHandler as unknown as (event: MockEvent) => Promise<unknown>
const logout = logoutHandler as unknown as (event: MockEvent) => Promise<unknown>

const user = {
  id: 'u1',
  email: 'ash@x.com',
  passwordHash: 'hashed:secret12',
  createdAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  resetRateLimits()
})

describe('POST /api/auth/register', () => {
  it('creates the user (normalized email, hashed password), sets the session, 201', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null)
    vi.mocked(createUser).mockResolvedValue(user)

    const event: MockEvent = { body: { email: 'Ash@X.com', password: 'secret12' } }
    const result = await register(event)

    expect(createUser).toHaveBeenCalledWith({ email: 'ash@x.com', passwordHash: 'hashed:secret12' })
    expect(event.session).toEqual({ user: { id: 'u1', email: 'ash@x.com' } })
    expect(result).toEqual({ id: 'u1', email: 'ash@x.com' })
    // The 201 status is set via h3's setResponseStatus and verified by the live smoke test.
  })

  it('rejects a duplicate email with 409', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(user)
    await expect(
      register({ body: { email: 'ash@x.com', password: 'secret12' } }),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(createUser).not.toHaveBeenCalled()
  })

  it('rejects an invalid body with 400', async () => {
    await expect(
      register({ body: { email: 'not-an-email', password: 'x' } }),
    ).rejects.toMatchObject({
      statusCode: 400,
    })
  })
})

describe('POST /api/auth/login', () => {
  it('sets the session and returns the user on valid credentials', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(user)

    const event: MockEvent = { body: { email: 'ash@x.com', password: 'secret12' } }
    const result = await login(event)

    expect(event.session).toEqual({ user: { id: 'u1', email: 'ash@x.com' } })
    expect(result).toEqual({ id: 'u1', email: 'ash@x.com' })
  })

  it('returns the same generic 401 for a wrong password and an unknown user', async () => {
    type ApiError = { statusCode?: number; message?: string }

    vi.mocked(findUserByEmail).mockResolvedValueOnce(user) // wrong password
    const wrongPw = (await login({
      body: { email: 'ash@x.com', password: 'wrongpass1' },
    }).catch((e) => e)) as ApiError

    vi.mocked(findUserByEmail).mockResolvedValueOnce(null) // unknown user
    const noUser = (await login({
      body: { email: 'ghost@x.com', password: 'secret12' },
    }).catch((e) => e)) as ApiError

    expect(wrongPw.statusCode).toBe(401)
    expect(noUser.statusCode).toBe(401)
    expect(wrongPw.message).toBe(noUser.message)
  })
})

describe('POST /api/auth/logout', () => {
  it('clears the session and returns 204', async () => {
    const event: MockEvent = { session: { user: { id: 'u1', email: 'ash@x.com' } } }
    await logout(event)
    expect(event.session).toBeNull()
    // The 204 status is set via h3's setResponseStatus and verified by the live smoke test.
  })
})

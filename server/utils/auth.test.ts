import { describe, expect, it } from 'vitest'
import { requireUser } from './auth'

// requireUser wraps the (faked) requireUserSession global from server-globals.
const call = requireUser as unknown as (event: unknown) => Promise<unknown>

describe('requireUser', () => {
  it('returns the session user when authenticated', async () => {
    const user = { id: 'u1', email: 'ash@x.com' }
    await expect(call({ session: { user } })).resolves.toEqual(user)
  })

  it('throws 401 when there is no session', async () => {
    await expect(call({})).rejects.toMatchObject({ statusCode: 401 })
  })
})

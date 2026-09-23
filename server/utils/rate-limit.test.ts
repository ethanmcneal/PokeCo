import { beforeEach, describe, expect, it } from 'vitest'
import { rateLimit, resetRateLimits } from './rate-limit'

beforeEach(() => {
  resetRateLimits()
})

describe('rateLimit', () => {
  it('allows up to the limit within a window, then blocks', () => {
    const now = 1_000
    expect(rateLimit('k', 3, 1_000, now).allowed).toBe(true)
    expect(rateLimit('k', 3, 1_000, now).allowed).toBe(true)
    expect(rateLimit('k', 3, 1_000, now).allowed).toBe(true)

    const blocked = rateLimit('k', 3, 1_000, now)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
  })

  it('resets once the window elapses', () => {
    expect(rateLimit('k', 1, 1_000, 0).allowed).toBe(true)
    expect(rateLimit('k', 1, 1_000, 500).allowed).toBe(false)
    expect(rateLimit('k', 1, 1_000, 1_000).allowed).toBe(true)
  })

  it('tracks keys independently', () => {
    expect(rateLimit('a', 1, 1_000, 0).allowed).toBe(true)
    expect(rateLimit('b', 1, 1_000, 0).allowed).toBe(true)
    expect(rateLimit('a', 1, 1_000, 0).allowed).toBe(false)
  })
})

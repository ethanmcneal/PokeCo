import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CollectionEntry } from '../../../shared/types'
import * as service from '../../services/collection.service'
import { resetRateLimits } from '../../utils/rate-limit'
import releaseHandler from './[pokemonId].delete'
import listHandler from './index.get'
import catchHandler from './index.post'

// Drive the real handlers with the service mocked and framework plumbing faked
// (server-globals). Covers the auth guard (401), validation (400), catch/list/
// release, and upstream-not-found (404). Success status codes (201/204) are set
// via h3's setResponseStatus and verified by the live smoke test.
vi.mock('../../services/collection.service', () => ({
  catchPokemon: vi.fn(),
  listCollection: vi.fn(),
  releasePokemon: vi.fn(),
}))

interface MockEvent {
  body?: unknown
  params?: Record<string, string>
  session?: { user?: { id: string; email: string } } | null
}
const doCatch = catchHandler as unknown as (e: MockEvent) => Promise<unknown>
const list = listHandler as unknown as (e: MockEvent) => Promise<unknown>
const release = releaseHandler as unknown as (e: MockEvent) => Promise<unknown>

const authed = (extra: Partial<MockEvent> = {}): MockEvent => ({
  session: { user: { id: 'u1', email: 'ash@x.com' } },
  ...extra,
})

const entry: CollectionEntry = {
  pokemonId: 25,
  pokemonName: 'pikachu',
  spriteUrl: 'pika.png',
  caughtAt: '2026-01-02T03:04:05.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  resetRateLimits()
})

describe('POST /api/collection', () => {
  it('rejects an anonymous request with 401', async () => {
    await expect(doCatch({ body: { pokemonId: 25 } })).rejects.toMatchObject({ statusCode: 401 })
    expect(service.catchPokemon).not.toHaveBeenCalled()
  })

  it('catches for the session user and returns the entry', async () => {
    vi.mocked(service.catchPokemon).mockResolvedValue(entry)
    const result = await doCatch(authed({ body: { pokemonId: 25 } }))
    expect(service.catchPokemon).toHaveBeenCalledWith('u1', 25)
    expect(result).toEqual(entry)
  })

  it('rejects an invalid body with 400', async () => {
    await expect(doCatch(authed({ body: { pokemonId: -1 } }))).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('maps an unknown pokemonId to 404', async () => {
    vi.mocked(service.catchPokemon).mockRejectedValue({ statusCode: 404 })
    await expect(doCatch(authed({ body: { pokemonId: 99999 } }))).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('GET /api/collection', () => {
  it('rejects an anonymous request with 401', async () => {
    await expect(list({})).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns the session user’s collection', async () => {
    vi.mocked(service.listCollection).mockResolvedValue([entry])
    const result = await list(authed())
    expect(service.listCollection).toHaveBeenCalledWith('u1')
    expect(result).toEqual([entry])
  })
})

describe('DELETE /api/collection/:pokemonId', () => {
  it('rejects an anonymous request with 401', async () => {
    await expect(release({ params: { pokemonId: '25' } })).rejects.toMatchObject({
      statusCode: 401,
    })
    expect(service.releasePokemon).not.toHaveBeenCalled()
  })

  it('releases for the session user', async () => {
    vi.mocked(service.releasePokemon).mockResolvedValue()
    await release(authed({ params: { pokemonId: '25' } }))
    expect(service.releasePokemon).toHaveBeenCalledWith('u1', 25)
  })

  it('rejects an invalid id with 400', async () => {
    await expect(release(authed({ params: { pokemonId: 'abc' } }))).rejects.toMatchObject({
      statusCode: 400,
    })
  })
})

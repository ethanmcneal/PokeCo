import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Page, PokemonDetail, PokemonListItem } from '../../../shared/types'
import { getPokemonDetail, getPokemonList } from '../../services/pokemon.service'
import detailHandler from './[name].get'
import listHandler from './index.get'

// Drive the real handlers with the service mocked (upstream stubbed). Covers
// validation → 400 (incl. unknown type), not-found → 404, and happy-path shapes.
// (Vitest hoists vi.mock above the imports at transform time.)
vi.mock('../../services/pokemon.service', () => ({
  getPokemonList: vi.fn(),
  getPokemonDetail: vi.fn(),
}))

const list = listHandler as unknown as (event: unknown) => Promise<unknown>
const detail = detailHandler as unknown as (event: unknown) => Promise<unknown>

const emptyPage: Page<PokemonListItem> = { items: [], total: 0, limit: 20, offset: 0 }
const sampleDetail: PokemonDetail = {
  id: 1,
  name: 'bulbasaur',
  heightM: 0.7,
  weightKg: 6.9,
  abilities: [{ name: 'overgrow', isHidden: false }],
  types: ['grass'],
  spriteUrl: 'default.png',
  isGrassType: true,
  shinySpriteUrl: 'shiny.png',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/pokemon', () => {
  it('applies limit/offset defaults and returns the service page', async () => {
    vi.mocked(getPokemonList).mockResolvedValue(emptyPage)

    const result = await list({ query: {} })

    expect(getPokemonList).toHaveBeenCalledWith(expect.objectContaining({ limit: 20, offset: 0 }))
    expect(result).toBe(emptyPage)
  })

  it('passes search and a valid type through to the service', async () => {
    vi.mocked(getPokemonList).mockResolvedValue(emptyPage)

    await list({ query: { search: 'pikachu' } })
    expect(getPokemonList).toHaveBeenCalledWith(expect.objectContaining({ search: 'pikachu' }))

    await list({ query: { type: 'grass' } })
    expect(getPokemonList).toHaveBeenCalledWith(expect.objectContaining({ type: 'grass' }))
  })

  it.each([
    ['limit below 1', { limit: '0' }],
    ['limit above 100', { limit: '101' }],
    ['negative offset', { offset: '-1' }],
    ['unknown type', { type: 'notatype' }],
  ])('rejects %s with 400', async (_label, query) => {
    await expect(list({ query })).rejects.toMatchObject({ statusCode: 400 })
    expect(getPokemonList).not.toHaveBeenCalled()
  })

  it('maps an upstream failure to 502', async () => {
    vi.mocked(getPokemonList).mockRejectedValue(new Error('network down'))
    await expect(list({ query: {} })).rejects.toMatchObject({ statusCode: 502 })
  })
})

describe('GET /api/pokemon/:name', () => {
  it('returns the detail DTO on success', async () => {
    vi.mocked(getPokemonDetail).mockResolvedValue(sampleDetail)

    const result = await detail({ params: { name: 'bulbasaur' } })

    expect(getPokemonDetail).toHaveBeenCalledWith('bulbasaur')
    expect(result).toBe(sampleDetail)
  })

  it('returns 404 when the Pokémon does not exist', async () => {
    vi.mocked(getPokemonDetail).mockRejectedValue({ statusCode: 404 })
    await expect(detail({ params: { name: 'missingno' } })).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('maps other upstream failures to 502', async () => {
    vi.mocked(getPokemonDetail).mockRejectedValue(new Error('boom'))
    await expect(detail({ params: { name: 'bulbasaur' } })).rejects.toMatchObject({
      statusCode: 502,
    })
  })

  it('rejects a missing name with 400', async () => {
    await expect(detail({ params: {} })).rejects.toMatchObject({ statusCode: 400 })
    expect(getPokemonDetail).not.toHaveBeenCalled()
  })
})

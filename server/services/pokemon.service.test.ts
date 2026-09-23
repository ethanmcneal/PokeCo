import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RawPokemon } from '../utils/pokeapi'
import { fetchPokemonByName, fetchPokemonList, fetchTypeMembers } from '../utils/pokeapi'
import { getPokemonDetail, getPokemonList } from './pokemon.service'

// The upstream client is mocked so these tests are pure and offline; they
// exercise the shaping, the Grass → shiny rule, and the list-source branching.
// (Vitest hoists vi.mock above the imports at transform time.)
vi.mock('../utils/pokeapi', () => ({
  fetchPokemonByName: vi.fn(),
  fetchPokemonList: vi.fn(),
  fetchTypeMembers: vi.fn(),
}))

const asMock = <T extends (...args: never[]) => unknown>(fn: T) => vi.mocked(fn)

function raw(overrides: Partial<RawPokemon> = {}): RawPokemon {
  return {
    id: 1,
    name: 'bulbasaur',
    height: 7, // → 0.7 m
    weight: 69, // → 6.9 kg
    abilities: [
      { ability: { name: 'overgrow', url: '' }, is_hidden: false, slot: 1 },
      { ability: { name: 'chlorophyll', url: '' }, is_hidden: true, slot: 3 },
    ],
    types: [{ slot: 1, type: { name: 'grass', url: '' } }],
    sprites: { front_default: 'default.png', front_shiny: 'shiny.png' },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPokemonDetail', () => {
  it('shapes the DTO and converts units', async () => {
    asMock(fetchPokemonByName).mockResolvedValue(raw())

    const detail = await getPokemonDetail('bulbasaur')

    expect(detail).toMatchObject({
      id: 1,
      name: 'bulbasaur',
      heightM: 0.7,
      weightKg: 6.9,
      types: ['grass'],
      spriteUrl: 'default.png',
    })
    expect(detail.abilities).toEqual([
      { name: 'overgrow', isHidden: false },
      { name: 'chlorophyll', isHidden: true },
    ])
  })

  it('exposes the shiny form for a Grass type (AC-3.4)', async () => {
    asMock(fetchPokemonByName).mockResolvedValue(raw()) // pure grass
    const detail = await getPokemonDetail('bulbasaur')
    expect(detail.isGrassType).toBe(true)
    expect(detail.shinySpriteUrl).toBe('shiny.png')
  })

  it('treats a Grass secondary type as Grass', async () => {
    asMock(fetchPokemonByName).mockResolvedValue(
      raw({
        types: [
          { slot: 1, type: { name: 'poison', url: '' } },
          { slot: 2, type: { name: 'grass', url: '' } },
        ],
      }),
    )
    const detail = await getPokemonDetail('venusaur')
    expect(detail.isGrassType).toBe(true)
    expect(detail.shinySpriteUrl).toBe('shiny.png')
  })

  it('hides the shiny form for a non-Grass type', async () => {
    asMock(fetchPokemonByName).mockResolvedValue(
      raw({ id: 4, name: 'charmander', types: [{ slot: 1, type: { name: 'fire', url: '' } }] }),
    )
    const detail = await getPokemonDetail('charmander')
    expect(detail.isGrassType).toBe(false)
    expect(detail.shinySpriteUrl).toBeNull()
  })
})

describe('getPokemonList — source selection', () => {
  it('default: pages the master list and enriches each entry', async () => {
    asMock(fetchPokemonList).mockResolvedValue({
      count: 1302,
      results: [
        { name: 'bulbasaur', url: '' },
        { name: 'ivysaur', url: '' },
      ],
    })
    asMock(fetchPokemonByName).mockImplementation((name: string) => Promise.resolve(raw({ name })))

    const page = await getPokemonList({ limit: 20, offset: 0 })

    expect(fetchPokemonList).toHaveBeenCalledWith(20, 0)
    expect(page.total).toBe(1302)
    expect(page.items.map((i) => i.name)).toEqual(['bulbasaur', 'ivysaur'])
  })

  it('search: resolves a single match into a one-item page', async () => {
    asMock(fetchPokemonByName).mockResolvedValue(raw({ id: 25, name: 'pikachu' }))
    const page = await getPokemonList({ limit: 20, offset: 0, search: 'pikachu' })
    expect(page.items).toHaveLength(1)
    expect(page.total).toBe(1)
    expect(page.items[0]!.id).toBe(25)
  })

  it('search: a miss yields an empty page, not an error (AC-2.2)', async () => {
    asMock(fetchPokemonByName).mockRejectedValue(new Error('404'))
    const page = await getPokemonList({ limit: 20, offset: 0, search: 'missingno' })
    expect(page.items).toHaveLength(0)
    expect(page.total).toBe(0)
  })

  it('type: paginates the type members by limit/offset', async () => {
    asMock(fetchTypeMembers).mockResolvedValue({
      pokemon: [
        { slot: 1, pokemon: { name: 'bulbasaur', url: '' } },
        { slot: 1, pokemon: { name: 'oddish', url: '' } },
        { slot: 1, pokemon: { name: 'bellsprout', url: '' } },
      ],
    })
    asMock(fetchPokemonByName).mockImplementation((name: string) => Promise.resolve(raw({ name })))

    const page = await getPokemonList({ limit: 2, offset: 0, type: 'grass' })

    expect(fetchTypeMembers).toHaveBeenCalledWith('grass')
    expect(page.total).toBe(3) // full membership count
    expect(page.items.map((i) => i.name)).toEqual(['bulbasaur', 'oddish'])
  })

  it('search takes precedence over type', async () => {
    asMock(fetchPokemonByName).mockResolvedValue(raw({ id: 25, name: 'pikachu' }))
    await getPokemonList({ limit: 20, offset: 0, search: 'pikachu', type: 'grass' })
    expect(fetchPokemonByName).toHaveBeenCalledWith('pikachu')
    expect(fetchTypeMembers).not.toHaveBeenCalled()
  })
})

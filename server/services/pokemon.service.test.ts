import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RawPokemon, RawPokemonSpecies } from '../utils/pokeapi'
import {
  fetchAllPokemonNames,
  fetchPokemonByName,
  fetchPokemonList,
  fetchPokemonSpecies,
  fetchTypeMembers,
} from '../utils/pokeapi'
import { getPokemonDetail, getPokemonList } from './pokemon.service'

// The upstream client is mocked so these tests are pure and offline; they
// exercise the shaping, the Grass → shiny rule, and the list-source branching.
// (Vitest hoists vi.mock above the imports at transform time.)
vi.mock('../utils/pokeapi', () => ({
  fetchAllPokemonNames: vi.fn(),
  fetchPokemonByName: vi.fn(),
  fetchPokemonList: vi.fn(),
  fetchPokemonSpecies: vi.fn(),
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
    species: { name: 'bulbasaur', url: '' },
    ...overrides,
  }
}

function species(overrides: Partial<RawPokemonSpecies> = {}): RawPokemonSpecies {
  return {
    flavor_text_entries: [
      // A non-English entry first, plus PokéAPI's control-character padding, to
      // prove language selection and cleaning.
      { flavor_text: 'french text', language: { name: 'fr', url: '' }, version: { name: 'x', url: '' } },
      {
        flavor_text: 'A strange\nseed was\fplanted on its back at birth.',
        language: { name: 'en', url: '' },
        version: { name: 'red', url: '' },
      },
    ],
    genera: [
      { genus: 'たねポケモン', language: { name: 'ja', url: '' } },
      { genus: 'Seed Pokémon', language: { name: 'en', url: '' } },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Sensible default for the detail path; individual tests override as needed.
  asMock(fetchPokemonSpecies).mockResolvedValue(species())
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

  it('adds the English genus and a cleaned description from the species', async () => {
    asMock(fetchPokemonByName).mockResolvedValue(raw())
    asMock(fetchPokemonSpecies).mockResolvedValue(species())

    const detail = await getPokemonDetail('bulbasaur')

    expect(fetchPokemonSpecies).toHaveBeenCalledWith('bulbasaur')
    expect(detail.genus).toBe('Seed Pokémon')
    // Control characters collapsed to single spaces.
    expect(detail.description).toBe('A strange seed was planted on its back at birth.')
  })

  it('degrades gracefully when the species lookup fails', async () => {
    asMock(fetchPokemonByName).mockResolvedValue(raw())
    asMock(fetchPokemonSpecies).mockRejectedValue(new Error('404'))

    const detail = await getPokemonDetail('bulbasaur')

    expect(detail.genus).toBeNull()
    expect(detail.description).toBeNull()
    expect(detail.name).toBe('bulbasaur') // core detail still renders
  })

  it('exposes the shiny form for a Grass type (AC-3.4)', async () => {
    asMock(fetchPokemonByName).mockResolvedValue(raw()) // pure grass
    const detail = await getPokemonDetail('bulbasaur')
    expect(detail.hasShinyForm).toBe(true)
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
    expect(detail.hasShinyForm).toBe(true)
    expect(detail.shinySpriteUrl).toBe('shiny.png')
  })

  it('hides the shiny form for a non-Grass type', async () => {
    asMock(fetchPokemonByName).mockResolvedValue(
      raw({ id: 4, name: 'charmander', types: [{ slot: 1, type: { name: 'fire', url: '' } }] }),
    )
    const detail = await getPokemonDetail('charmander')
    expect(detail.hasShinyForm).toBe(false)
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

  it('search: matches substrings and returns all of them (AC-2.1)', async () => {
    asMock(fetchAllPokemonNames).mockResolvedValue({
      count: 4,
      results: [
        { name: 'magnemite', url: '' },
        { name: 'magneton', url: '' },
        { name: 'magmar', url: '' },
        { name: 'pikachu', url: '' }, // non-match
      ],
    })
    asMock(fetchPokemonByName).mockImplementation((name: string) => Promise.resolve(raw({ name })))

    const page = await getPokemonList({ limit: 20, offset: 0, search: 'mag' })

    expect(page.total).toBe(3)
    expect(page.items.map((i) => i.name)).toEqual(['magnemite', 'magneton', 'magmar'])
  })

  it('search: is case-insensitive and paginates the matches', async () => {
    asMock(fetchAllPokemonNames).mockResolvedValue({
      count: 3,
      results: [
        { name: 'magnemite', url: '' },
        { name: 'magneton', url: '' },
        { name: 'magmar', url: '' },
      ],
    })
    asMock(fetchPokemonByName).mockImplementation((name: string) => Promise.resolve(raw({ name })))

    const page = await getPokemonList({ limit: 2, offset: 2, search: 'MAG' })

    expect(page.total).toBe(3) // full match count
    expect(page.items.map((i) => i.name)).toEqual(['magmar']) // the third match
  })

  it('search: excludes alternate forms and coincidental substrings in form names', async () => {
    asMock(fetchAllPokemonNames).mockResolvedValue({
      count: 3,
      results: [
        { name: 'magnemite', url: 'https://pokeapi.co/api/v2/pokemon/81/' },
        // A form (id >= 10000) whose name happens to contain "mag" inside "plumage".
        { name: 'squawkabilly-green-plumage', url: 'https://pokeapi.co/api/v2/pokemon/10264/' },
        // A base species with an internal "mag" match — this one should stay.
        { name: 'mismagius', url: 'https://pokeapi.co/api/v2/pokemon/429/' },
      ],
    })
    asMock(fetchPokemonByName).mockImplementation((name: string) => Promise.resolve(raw({ name })))

    const page = await getPokemonList({ limit: 20, offset: 0, search: 'mag' })

    expect(page.items.map((i) => i.name)).toEqual(['magnemite', 'mismagius'])
    expect(page.total).toBe(2)
  })

  it('search: a miss yields an empty page, not an error (AC-2.2)', async () => {
    asMock(fetchAllPokemonNames).mockResolvedValue({
      count: 1,
      results: [{ name: 'pikachu', url: '' }],
    })
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
    asMock(fetchAllPokemonNames).mockResolvedValue({
      count: 1,
      results: [{ name: 'pikachu', url: '' }],
    })
    asMock(fetchPokemonByName).mockImplementation((name: string) => Promise.resolve(raw({ name })))

    await getPokemonList({ limit: 20, offset: 0, search: 'pikachu', type: 'grass' })

    expect(fetchAllPokemonNames).toHaveBeenCalled()
    expect(fetchTypeMembers).not.toHaveBeenCalled()
  })
})

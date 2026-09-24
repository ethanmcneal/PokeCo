import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CaughtPokemon } from '@prisma/client'
import * as repo from '../repositories/collection.repository'
import { fetchPokemonByName } from '../utils/pokeapi'
import { catchPokemon, listCollection, releasePokemon } from './collection.service'

// Repository (DB) and upstream client are mocked; these test the service's
// resolve-then-persist orchestration and the CollectionEntry mapping.
vi.mock('../repositories/collection.repository', () => ({
  catchPokemon: vi.fn(),
  listCaughtByUser: vi.fn(),
  releasePokemon: vi.fn(),
}))
vi.mock('../utils/pokeapi', () => ({
  fetchPokemonByName: vi.fn(),
}))

const caught = (overrides: Partial<CaughtPokemon> = {}): CaughtPokemon => ({
  id: 'c1',
  userId: 'u1',
  pokemonId: 1,
  pokemonName: 'bulbasaur',
  spriteUrl: 'default.png',
  caughtAt: new Date('2026-01-02T03:04:05.000Z'),
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('catchPokemon', () => {
  it('resolves display fields from the upstream and persists them', async () => {
    vi.mocked(fetchPokemonByName).mockResolvedValue({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      abilities: [],
      types: [],
      sprites: { front_default: 'pika.png', front_shiny: 'pika-shiny.png' },
    })
    vi.mocked(repo.catchPokemon).mockResolvedValue(
      caught({ pokemonId: 25, pokemonName: 'pikachu', spriteUrl: 'pika.png' }),
    )

    const entry = await catchPokemon('u1', 25)

    expect(fetchPokemonByName).toHaveBeenCalledWith('25')
    expect(repo.catchPokemon).toHaveBeenCalledWith('u1', {
      pokemonId: 25,
      pokemonName: 'pikachu',
      spriteUrl: 'pika.png',
    })
    expect(entry).toEqual({
      pokemonId: 25,
      pokemonName: 'pikachu',
      spriteUrl: 'pika.png',
      caughtAt: '2026-01-02T03:04:05.000Z',
    })
  })

  it('stores an empty sprite when the upstream has none', async () => {
    vi.mocked(fetchPokemonByName).mockResolvedValue({
      id: 1,
      name: 'bulbasaur',
      height: 7,
      weight: 69,
      abilities: [],
      types: [],
      sprites: { front_default: null, front_shiny: null },
    })
    vi.mocked(repo.catchPokemon).mockResolvedValue(caught({ spriteUrl: '' }))

    const entry = await catchPokemon('u1', 1)

    expect(repo.catchPokemon).toHaveBeenCalledWith('u1', {
      pokemonId: 1,
      pokemonName: 'bulbasaur',
      spriteUrl: '',
    })
    expect(entry.spriteUrl).toBeNull()
  })
})

describe('listCollection', () => {
  it('maps stored rows to entries (ISO caughtAt)', async () => {
    vi.mocked(repo.listCaughtByUser).mockResolvedValue([caught()])
    const entries = await listCollection('u1')
    expect(repo.listCaughtByUser).toHaveBeenCalledWith('u1')
    expect(entries).toEqual([
      {
        pokemonId: 1,
        pokemonName: 'bulbasaur',
        spriteUrl: 'default.png',
        caughtAt: '2026-01-02T03:04:05.000Z',
      },
    ])
  })
})

describe('releasePokemon', () => {
  it('delegates to the repository, scoped to the user', async () => {
    vi.mocked(repo.releasePokemon).mockResolvedValue()
    await releasePokemon('u1', 4)
    expect(repo.releasePokemon).toHaveBeenCalledWith('u1', 4)
  })
})

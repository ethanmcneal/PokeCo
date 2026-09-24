// Business logic for the collection: resolves display fields for a catch from
// the cached PokéAPI, persists via the repository, and maps stored rows to the
// CollectionEntry DTO. Depends on repository + pokeapi, never on HTTP.
// See specs/02-architecture.md, specs/04-api-contract.md.
import type { CaughtPokemon } from '@prisma/client'
import type { CollectionEntry } from '../../shared/types'
import {
  catchPokemon as catchInRepo,
  listCaughtByUser,
  releasePokemon as releaseInRepo,
} from '../repositories/collection.repository'
import { fetchPokemonByName } from '../utils/pokeapi'

function toEntry(caught: CaughtPokemon): CollectionEntry {
  return {
    pokemonId: caught.pokemonId,
    pokemonName: caught.pokemonName,
    // Column is non-null; an empty snapshot (no upstream sprite) maps back to null.
    spriteUrl: caught.spriteUrl || null,
    caughtAt: caught.caughtAt.toISOString(),
  }
}

/**
 * Catch a Pokémon for a user. Resolves name/sprite from the cached upstream
 * (which also validates the id exists — a bad id throws upstream-404), then
 * upserts idempotently on (userId, pokemonId).
 */
export async function catchPokemon(userId: string, pokemonId: number): Promise<CollectionEntry> {
  const raw = await fetchPokemonByName(String(pokemonId))
  const entry = await catchInRepo(userId, {
    pokemonId: raw.id,
    pokemonName: raw.name,
    spriteUrl: raw.sprites.front_default ?? '',
  })
  return toEntry(entry)
}

/** The user's collection, newest first. */
export async function listCollection(userId: string): Promise<CollectionEntry[]> {
  const caught = await listCaughtByUser(userId)
  return caught.map(toEntry)
}

/** Release a Pokémon from the user's collection (idempotent). */
export function releasePokemon(userId: string, pokemonId: number): Promise<void> {
  return releaseInRepo(userId, pokemonId)
}

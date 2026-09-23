/**
 * Shared DTOs — the single source of truth for the contract between the Nitro
 * API (server/) and the Vue app (app/). Defined once so a contract change is a
 * compile error on both sides. See specs/04-api-contract.md.
 */

export interface PokemonListItem {
  id: number
  name: string
  spriteUrl: string | null
  types: string[]
}

export interface Ability {
  name: string
  isHidden: boolean
}

export interface PokemonDetail {
  id: number
  name: string
  /** Height in metres (converted from PokéAPI decimetres). */
  heightM: number
  /** Weight in kilograms (converted from PokéAPI hectograms). */
  weightKg: number
  abilities: Ability[]
  types: string[]
  spriteUrl: string | null
  /** Result of the Grass → shiny business rule. */
  isGrassType: boolean
  /** Populated only when isGrassType is true, otherwise null (AC-3.4). */
  shinySpriteUrl: string | null
}

export interface CollectionEntry {
  pokemonId: number
  pokemonName: string
  spriteUrl: string | null
  /** ISO 8601 timestamp of when the Pokémon was caught. */
  caughtAt: string
}

export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface PublicUser {
  id: string
  email: string
}

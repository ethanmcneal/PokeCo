// The single place that knows PokéAPI's URL shape and caches its responses.
// Everything upstream flows through here; services never call PokéAPI directly.
// See specs/02-architecture.md (PokéAPI integration & caching).

// --- Raw upstream shapes (only the fields we consume) ---

export interface RawNamedResource {
  name: string
  url: string
}

export interface RawPokemonListResponse {
  count: number
  results: RawNamedResource[]
}

export interface RawAbilityEntry {
  ability: RawNamedResource
  is_hidden: boolean
  slot: number
}

export interface RawTypeEntry {
  slot: number
  type: RawNamedResource
}

export interface RawSprites {
  front_default: string | null
  front_shiny: string | null
}

export interface RawPokemon {
  id: number
  name: string
  height: number // decimeters
  weight: number // hectograms
  abilities: RawAbilityEntry[]
  types: RawTypeEntry[]
  sprites: RawSprites
  species: RawNamedResource
}

export interface RawTypeResponse {
  pokemon: { slot: number; pokemon: RawNamedResource }[]
}

// A "flavor text" entry is a Pokédex description; the same species has many,
// one per language and game version. We surface the first English one.
export interface RawFlavorTextEntry {
  flavor_text: string
  language: RawNamedResource
  version: RawNamedResource
}

export interface RawGenus {
  genus: string // e.g. "Seed Pokémon"
  language: RawNamedResource
}

export interface RawPokemonSpecies {
  flavor_text_entries: RawFlavorTextEntry[]
  genera: RawGenus[]
}

// --- Client ---

// Pokémon reference data is effectively immutable, so we cache aggressively.
const CACHE_MAX_AGE = 60 * 60 * 24 // 24h

function baseUrl(): string {
  return useRuntimeConfig().pokeApiBaseUrl
}

/**
 * A page of the master Pokémon list. Returns names + URLs only; callers enrich
 * each entry via {@link fetchPokemonByName}.
 */
export const fetchPokemonList = defineCachedFunction(
  (limit: number, offset: number): Promise<RawPokemonListResponse> =>
    $fetch<RawPokemonListResponse>(`${baseUrl()}/pokemon`, { query: { limit, offset } }),
  {
    name: 'pokeapi:list',
    maxAge: CACHE_MAX_AGE,
    getKey: (limit, offset) => `${limit}:${offset}`,
  },
)

/**
 * The full Pokémon name list (national-dex order), fetched once and cached.
 * PokéAPI has no search endpoint, so substring search filters this list
 * locally. The large limit returns every entry in a single response.
 */
export const fetchAllPokemonNames = defineCachedFunction(
  (): Promise<RawPokemonListResponse> =>
    $fetch<RawPokemonListResponse>(`${baseUrl()}/pokemon`, { query: { limit: 100000, offset: 0 } }),
  {
    name: 'pokeapi:all-names',
    maxAge: CACHE_MAX_AGE,
    getKey: () => 'all',
  },
)

/** Full detail for one Pokémon by name (or numeric id). Throws on 404. */
export const fetchPokemonByName = defineCachedFunction(
  (name: string): Promise<RawPokemon> =>
    // encodeURIComponent guards the outbound URL against injection (07-security).
    $fetch<RawPokemon>(`${baseUrl()}/pokemon/${encodeURIComponent(name.toLowerCase())}`),
  {
    name: 'pokeapi:pokemon',
    maxAge: CACHE_MAX_AGE,
    getKey: (name) => name.toLowerCase(),
  },
)

/**
 * Species-level data for one Pokémon (Pokédex description + genus). Separate
 * upstream resource from {@link fetchPokemonByName}. Throws on 404.
 */
export const fetchPokemonSpecies = defineCachedFunction(
  (name: string): Promise<RawPokemonSpecies> =>
    $fetch<RawPokemonSpecies>(
      `${baseUrl()}/pokemon-species/${encodeURIComponent(name.toLowerCase())}`,
    ),
  {
    name: 'pokeapi:species',
    maxAge: CACHE_MAX_AGE,
    getKey: (name) => name.toLowerCase(),
  },
)

/** The members of a given type. Throws on an unknown type (404). */
export const fetchTypeMembers = defineCachedFunction(
  (type: string): Promise<RawTypeResponse> =>
    $fetch<RawTypeResponse>(`${baseUrl()}/type/${encodeURIComponent(type.toLowerCase())}`),
  {
    name: 'pokeapi:type',
    maxAge: CACHE_MAX_AGE,
    getKey: (type) => type.toLowerCase(),
  },
)

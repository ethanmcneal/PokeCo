// Business logic for Pokémon data: shapes raw PokéAPI responses into our DTOs
// and owns the Grass → shiny rule. Depends on the pokeapi client, never on HTTP
// or Prisma. See specs/02-architecture.md and specs/04-api-contract.md.
import type { Ability, Page, PokemonDetail, PokemonListItem } from '../../shared/types'
import type { RawPokemon } from '../utils/pokeapi'
import { fetchPokemonByName, fetchPokemonList, fetchTypeMembers } from '../utils/pokeapi'

const GRASS_TYPE = 'grass'

function toTypes(raw: RawPokemon): string[] {
  return raw.types.map((t) => t.type.name)
}

function toListItem(raw: RawPokemon): PokemonListItem {
  return {
    id: raw.id,
    name: raw.name,
    spriteUrl: raw.sprites.front_default,
    types: toTypes(raw),
  }
}

function toDetail(raw: RawPokemon): PokemonDetail {
  const types = toTypes(raw)
  const isGrassType = types.includes(GRASS_TYPE)
  const abilities: Ability[] = raw.abilities.map((a) => ({
    name: a.ability.name,
    isHidden: a.is_hidden,
  }))

  return {
    id: raw.id,
    name: raw.name,
    heightM: raw.height / 10, // decimetres → metres
    weightKg: raw.weight / 10, // hectograms → kilograms
    abilities,
    types,
    spriteUrl: raw.sprites.front_default,
    isGrassType,
    // The business rule (AC-3.4): shiny form is exposed only for Grass types.
    shinySpriteUrl: isGrassType ? raw.sprites.front_shiny : null,
  }
}

/** Enrich a set of names into list items (detail is cached upstream). */
async function toListItems(names: string[]): Promise<PokemonListItem[]> {
  const raws = await Promise.all(names.map((name) => fetchPokemonByName(name)))
  return raws.map(toListItem)
}

export interface ListOptions {
  limit: number
  offset: number
  search?: string
  type?: string
}

export function getPokemonDetail(name: string): Promise<PokemonDetail> {
  return fetchPokemonByName(name).then(toDetail)
}

/**
 * List for the browse grid. Source depends on the options (search precedence
 * over type): a single name lookup, a type's members, or the default page.
 */
export async function getPokemonList(opts: ListOptions): Promise<Page<PokemonListItem>> {
  const { limit, offset, search, type } = opts

  if (search) {
    // Exact name lookup; no match yields an empty page rather than an error.
    const raw = await fetchPokemonByName(search).catch(() => null)
    const items = raw ? [toListItem(raw)] : []
    return { items, total: items.length, limit, offset }
  }

  if (type) {
    const { pokemon } = await fetchTypeMembers(type)
    const names = pokemon.map((entry) => entry.pokemon.name)
    const items = await toListItems(names.slice(offset, offset + limit))
    return { items, total: names.length, limit, offset }
  }

  const { count, results } = await fetchPokemonList(limit, offset)
  const items = await toListItems(results.map((r) => r.name))
  return { items, total: count, limit, offset }
}

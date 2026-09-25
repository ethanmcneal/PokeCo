// Business logic for Pokémon data: shapes raw PokéAPI responses into our DTOs
// and owns the Grass → shiny rule. Depends on the pokeapi client, never on HTTP
// or Prisma. See specs/02-architecture.md and specs/04-api-contract.md.
import type { Ability, Page, PokemonDetail, PokemonListItem } from '../../shared/types'
import type { RawNamedResource, RawPokemon, RawPokemonSpecies } from '../utils/pokeapi'
import {
  fetchPokemonByName,
  fetchPokemonList,
  fetchPokemonSpecies,
  fetchTypeMembers,
} from '../utils/pokeapi'

// The set of types whose shiny form we surface. The requirement is Grass-only
// (AC-3.4); expressing it as a policy set keeps the rule data-driven and easy to
// change (e.g. add 'poison') without touching the shaping logic below.
const SHINY_TYPES: readonly string[] = ['grass']

function toTypes(raw: RawPokemon): string[] {
  return raw.types.map((t) => t.type.name)
}

/** The first entry in the caller's preferred language (English). */
function firstEnglish<T extends { language: RawNamedResource }>(entries: T[]): T | undefined {
  return entries.find((e) => e.language.name === 'en')
}

// PokéAPI flavour text is padded with control characters (newlines, form feeds)
// and soft hyphens from its original fixed-width game text. Normalise to a plain
// single-spaced sentence for the UI.
function cleanFlavorText(text: string): string {
  return text
    .replace(/\u00ad\s*/g, '') // soft hyphens: rejoin words split across lines
    .replace(/[\n\f\r]+/g, ' ') // hard breaks → spaces
    .replace(/\s+/g, ' ')
    .trim()
}

function toListItem(raw: RawPokemon): PokemonListItem {
  return {
    id: raw.id,
    name: raw.name,
    spriteUrl: raw.sprites.front_default,
    types: toTypes(raw),
  }
}

// Species data is optional: if the upstream lookup fails we still render the
// core detail, just without the description/genus.
function toDetail(raw: RawPokemon, species: RawPokemonSpecies | null): PokemonDetail {
  const types = toTypes(raw)
  const hasShinyForm = types.some((t) => SHINY_TYPES.includes(t))
  const abilities: Ability[] = raw.abilities.map((a) => ({
    name: a.ability.name,
    isHidden: a.is_hidden,
  }))

  const flavor = species && firstEnglish(species.flavor_text_entries)
  const genus = species && firstEnglish(species.genera)

  return {
    id: raw.id,
    name: raw.name,
    heightM: raw.height / 10, // decimetres → metres
    weightKg: raw.weight / 10, // hectograms → kilograms
    abilities,
    types,
    spriteUrl: raw.sprites.front_default,
    genus: genus ? genus.genus : null,
    description: flavor ? cleanFlavorText(flavor.flavor_text) : null,
    hasShinyForm,
    // The business rule (AC-3.4): shiny form is surfaced only for SHINY_TYPES.
    shinySpriteUrl: hasShinyForm ? raw.sprites.front_shiny : null,
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

export async function getPokemonDetail(name: string): Promise<PokemonDetail> {
  const raw = await fetchPokemonByName(name)
  // The description + genus come from the species resource. Degrade gracefully:
  // a species miss leaves those fields null rather than failing the whole page.
  const species = await fetchPokemonSpecies(raw.species.name).catch(() => null)
  return toDetail(raw, species)
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

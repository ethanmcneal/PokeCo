import type { PokemonType } from '#shared/pokemon'

// Canonical Pokémon type colors. Kept as a data map so TypeBadge (and TypeFilter)
// render from one source; badges pair color WITH a text label, never color alone
// (accessibility — see specs/05-frontend-ux.md).
export const TYPE_COLORS: Record<PokemonType, string> = {
  normal: '#9099a1',
  fire: '#ff9d55',
  water: '#4d90d5',
  grass: '#63bc5a',
  electric: '#f4d23c',
  ice: '#73cec0',
  fighting: '#ce4069',
  poison: '#ab6ac8',
  ground: '#d97845',
  flying: '#8fa8dd',
  psychic: '#fa7179',
  bug: '#90c12c',
  rock: '#c7b78b',
  ghost: '#5269ad',
  dragon: '#0b6dc3',
  dark: '#5a5366',
  steel: '#5a8ea1',
  fairy: '#ec8fe6',
}

const FALLBACK = '#9099a1'

export function typeColor(type: string): string {
  return TYPE_COLORS[type as PokemonType] ?? FALLBACK
}

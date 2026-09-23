import { z } from 'zod'
import { POKEMON_TYPES } from '../../shared/pokemon'

// Request-boundary schemas (specs/04-api-contract.md). Query params arrive as
// strings, so numeric fields are coerced. Bounds are enforced so a caller can't
// request unbounded work (07-security).

export const pokemonListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().min(1).optional(),
  // An unknown type fails validation -> 400, without an upstream call.
  type: z.enum(POKEMON_TYPES).optional(),
})

export const pokemonNameParamSchema = z.string().trim().min(1)

export type PokemonListQuery = z.infer<typeof pokemonListQuerySchema>

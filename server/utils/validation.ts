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

// Register/login share one shape. Email is normalized (trim + lowercase) before
// validation so it is stored and looked up consistently.
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
})

export type PokemonListQuery = z.infer<typeof pokemonListQuerySchema>
export type Credentials = z.infer<typeof credentialsSchema>

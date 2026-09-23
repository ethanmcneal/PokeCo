import { getPokemonList } from '../../services/pokemon.service'
import { pokemonListQuerySchema } from '../../utils/validation'

// GET /api/pokemon — browse/search/filter (specs/04-api-contract.md).
// Thin handler: validate -> call the service -> map failures to the error model.
export default defineEventHandler(async (event) => {
  const parsed = pokemonListQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
    })
  }

  try {
    return await getPokemonList(parsed.data)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'Failed to reach the Pokémon data source',
    })
  }
})

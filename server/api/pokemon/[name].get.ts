import { getPokemonDetail } from '../../services/pokemon.service'
import { isUpstreamNotFound } from '../../utils/errors'
import { pokemonNameParamSchema } from '../../utils/validation'

// GET /api/pokemon/:name — detail for one Pokémon (specs/04-api-contract.md).
export default defineEventHandler(async (event) => {
  const parsed = pokemonNameParamSchema.safeParse(getRouterParam(event, 'name'))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'A Pokémon name is required',
    })
  }

  try {
    return await getPokemonDetail(parsed.data)
  } catch (err) {
    if (isUpstreamNotFound(err)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Pokémon "${parsed.data}" not found`,
      })
    }
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'Failed to reach the Pokémon data source',
    })
  }
})

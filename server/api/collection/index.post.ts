import type { CollectionEntry } from '../../../shared/types'
import { catchPokemon } from '../../services/collection.service'
import { requireUser } from '../../utils/auth'
import { isUpstreamNotFound } from '../../utils/errors'
import { rateLimit } from '../../utils/rate-limit'
import { catchBodySchema } from '../../utils/validation'

// POST /api/collection — catch a Pokémon (specs/04-api-contract.md, AC-5.1–5.3).
export default defineEventHandler(async (event): Promise<CollectionEntry> => {
  const user = await requireUser(event)

  if (!rateLimit(`catch:${user.id}`, 60, 60_000).allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Too many catches. Please slow down.',
    })
  }

  const parsed = catchBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'A valid pokemonId is required',
    })
  }

  try {
    const entry = await catchPokemon(user.id, parsed.data.pokemonId)
    setResponseStatus(event, 201)
    return entry
  } catch (err) {
    if (isUpstreamNotFound(err)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `No Pokémon with id ${parsed.data.pokemonId}`,
      })
    }
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'Failed to reach the Pokémon data source',
    })
  }
})

import { releasePokemon } from '../../services/collection.service'
import { requireUser } from '../../utils/auth'
import { pokemonIdParamSchema } from '../../utils/validation'

// DELETE /api/collection/:pokemonId — release a Pokémon (AC-7.1). Idempotent and
// scoped to the session user.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const parsed = pokemonIdParamSchema.safeParse(getRouterParam(event, 'pokemonId'))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'A valid pokemonId is required',
    })
  }

  await releasePokemon(user.id, parsed.data)
  setResponseStatus(event, 204)
  return null
})

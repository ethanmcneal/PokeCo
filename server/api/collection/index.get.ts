import type { CollectionEntry } from '../../../shared/types'
import { listCollection } from '../../services/collection.service'
import { requireUser } from '../../utils/auth'

// GET /api/collection — the session user's collection (specs/04-api-contract.md,
// AC-6.1–6.3). Scoped to the authenticated user; never returns another's rows.
export default defineEventHandler(async (event): Promise<CollectionEntry[]> => {
  const user = await requireUser(event)
  return listCollection(user.id)
})

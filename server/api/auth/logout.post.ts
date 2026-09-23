// POST /api/auth/logout — clears the session (specs/04-api-contract.md, AC-4.2).
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  setResponseStatus(event, 204)
  return null
})

// Error helpers. Keep upstream/DB specifics from leaking to clients; handlers
// translate these into a uniform error model via createError.

/** True when an error from the PokéAPI client represents a 404 (not found). */
export function isUpstreamNotFound(err: unknown): boolean {
  const e = err as { statusCode?: number; status?: number; response?: { status?: number } } | null
  return e?.statusCode === 404 || e?.status === 404 || e?.response?.status === 404
}

/** True when a Prisma error is a unique-constraint violation (P2002). */
export function isUniqueConstraintError(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === 'P2002'
}

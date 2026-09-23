// Test doubles for the Nitro/h3 auto-imports our API handlers rely on. Faking
// only h3's plumbing (a dependency) lets endpoint tests drive the real handler
// logic — validation, branching, and error→status mapping — without booting a
// server or coupling to a specific h3 version.

interface MockEvent {
  query?: Record<string, unknown>
  params?: Record<string, string>
}

interface ErrorInput {
  statusCode?: number
  statusMessage?: string
  message?: string
}

const g = globalThis as unknown as Record<string, unknown>

g.defineEventHandler = <T>(fn: T): T => fn
g.getQuery = (event: MockEvent): Record<string, unknown> => event.query ?? {}
g.getRouterParam = (event: MockEvent, name: string): string | undefined => event.params?.[name]
g.createError = (input: ErrorInput): Error =>
  Object.assign(new Error(input.message ?? input.statusMessage ?? 'Error'), {
    statusCode: input.statusCode,
    statusMessage: input.statusMessage,
  })

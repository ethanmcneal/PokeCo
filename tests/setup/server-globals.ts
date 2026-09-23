// Test doubles for the Nitro/h3 and nuxt-auth-utils auto-imports our server
// code relies on. Faking only framework plumbing (dependencies) lets handler
// tests drive our real logic — validation, branching, error→status mapping,
// session set/clear — without booting a server. The real wiring is covered by
// live smoke tests each phase.

interface MockEvent {
  query?: Record<string, unknown>
  params?: Record<string, string>
  body?: unknown
  ip?: string
  statusCode?: number
  session?: { user?: unknown } | null
}

interface ErrorInput {
  statusCode?: number
  statusMessage?: string
  message?: string
}

const g = globalThis as unknown as Record<string, unknown>

// --- h3 ---
g.defineEventHandler = <T>(fn: T): T => fn
g.getQuery = (event: MockEvent) => event.query ?? {}
g.getRouterParam = (event: MockEvent, name: string) => event.params?.[name]
g.readBody = (event: MockEvent) => event.body
g.getRequestIP = (event: MockEvent) => event.ip
g.setResponseStatus = (event: MockEvent, code: number) => {
  event.statusCode = code
}
g.createError = (input: ErrorInput): Error =>
  Object.assign(new Error(input.message ?? input.statusMessage ?? 'Error'), {
    statusCode: input.statusCode,
    statusMessage: input.statusMessage,
  })

// --- nuxt-auth-utils ---
g.hashPassword = (password: string): Promise<string> => Promise.resolve(`hashed:${password}`)
g.verifyPassword = (hash: string, password: string): Promise<boolean> =>
  Promise.resolve(hash === `hashed:${password}`)
g.setUserSession = (event: MockEvent, data: { user?: unknown }): Promise<unknown> => {
  event.session = data
  return Promise.resolve(data)
}
g.clearUserSession = (event: MockEvent): Promise<void> => {
  event.session = null
  return Promise.resolve()
}
g.requireUserSession = (event: MockEvent): Promise<{ user?: unknown }> => {
  if (!event.session?.user) {
    return Promise.reject(Object.assign(new Error('Unauthorized'), { statusCode: 401 }))
  }
  return Promise.resolve(event.session)
}

# 07 — Security

Security is treated as a cross-cutting concern rather than a feature. The measures here are
proportionate to a small reference app with authentication, but they follow the same practices we
would apply to production software: validate everything at the edge, never trust the client, keep
secrets out of the codebase, and make the safe path the default path.

## Threat model (scoped)

The assets worth protecting are **user credentials** and **the integrity/isolation of each user's
collection**. The realistic risks for this app:

- Account takeover (weak credential handling, session theft, CSRF).
- One user reading or mutating another user's collection (broken authorization / IDOR).
- Injection (SQL, or injecting into the outbound PokéAPI request).
- Cross-site scripting (XSS) leaking a session or defacing the UI.
- Abuse of our endpoints (credential stuffing on login, hammering upstream through catch).
- Leaking internals through verbose errors or committed secrets.

PokéAPI is a trusted, read-only upstream; the untrusted inputs are the HTTP request and the user's
own field values.

## Controls

### Authentication & sessions
- Passwords are stored only as hashes via `nuxt-auth-utils`; plaintext is never persisted or logged
  ([03-data-model](./03-data-model.md)).
- Sessions are **sealed, httpOnly cookies** — not readable by client JavaScript, which keeps the
  session off the XSS attack surface. `Secure` in production; `SameSite=Lax` (see CSRF below).
- Login failures return a **generic** message (no "user not found" vs "wrong password"), avoiding
  account enumeration.
- Session secret comes from environment config and is required to boot; there is no committed
  default.

### CSRF
- State-changing routes (`POST /api/auth/*`, `POST`/`DELETE /api/collection`) rely on cookie
  sessions, so CSRF is considered explicitly. `SameSite` cookies block the common cross-site form
  case; requests are JSON (`Content-Type: application/json`), which is not a
  simple-form-submittable content type. If cross-site contexts were ever needed, a
  double-submit/synchronizer token would be added — noted as the extension point.

### Authorization (per-user isolation)
- Every collection query is scoped by the session user's `id` at the repository layer; there is no
  code path that reads or writes a collection without that filter ([AC-6.3](./01-requirements.md)).
  This is the primary defense against IDOR — the client never supplies the `userId`.

### Input validation
- Every request body, query, and path param is parsed with a **Zod** schema at the handler
  boundary; unknown or malformed input is rejected with `400` before reaching any logic.
- Bounds are enforced (e.g. `limit` capped at 100) so a caller cannot request unbounded work.

### Injection
- **SQL:** all persistence goes through Prisma's parameterized query API; no string-built SQL.
- **Outbound (SSRF/URL injection):** values interpolated into PokéAPI URLs (name, type, id) are
  validated/encoded first, so a crafted `name`/`type` cannot redirect the upstream request or
  traverse paths. The upstream base URL is fixed from config, not client-supplied.

### XSS
- Vue escapes interpolated content by default; we do not use `v-html` on any
  externally-sourced or user-sourced data.
- Combined with httpOnly session cookies, a successful script injection still cannot read the
  session.
- A **Content-Security-Policy** and companion security headers are set (see below) to reduce the
  impact of any injection.

### Security headers
- Set at the Nitro layer (route rules / a server plugin): `Content-Security-Policy`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`/frame-ancestors, and
  HSTS in production.

### Rate limiting & abuse
- Sensitive endpoints — `login`/`register` (credential stuffing) and `catch` (upstream
  amplification) — are rate limited per IP/session. This also protects PokéAPI, complementing the
  response cache in [02-architecture](./02-architecture.md).

### Secrets & configuration
- All secrets and connection strings come from environment variables; `.env` is gitignored and a
  `.env.example` documents the required keys without values. Nothing sensitive is committed.

### Error handling
- One error model via `createError`; clients get a safe message and status, never stack traces,
  raw DB errors, or upstream internals.

### Dependencies & transport
- A committed lockfile pins versions; `pnpm audit` runs in CI to surface known-vulnerable
  dependencies. TLS terminates in front of the app in production; cookies are `Secure` there.

## Reviewing AI-generated code

Because parts of this project are drafted with AI tooling, generated code is reviewed against this
spec before it ships — specifically checking that validation is present at each new boundary, that
new collection queries are user-scoped, that no secret or `v-html` slips in, and that persistence
stays on the parameterized Prisma API. Security is a review gate, not an afterthought.

## Requirement traceability

| Control | Related requirement / spec |
|---|---|
| Per-user isolation | [AC-6.3](./01-requirements.md), [03-data-model](./03-data-model.md) |
| Auth guard → 401 | [AC-4.3](./01-requirements.md), [04-api-contract](./04-api-contract.md) |
| Password hashing / sessions | [ADR 0003](./adr/0003-session-auth-strategy.md) |
| Input validation | [04-api-contract](./04-api-contract.md) (Zod at every boundary) |

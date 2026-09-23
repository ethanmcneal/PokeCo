# 02 — Architecture

## System shape

A single Nuxt application serving both the UI and the API. The Nitro server (Nuxt's Node server)
exposes `/api/*` routes; the Vue frontend consumes them. PokéAPI sits behind our server, never
called directly from the browser.

```
                        ┌─────────────────────────────────────────────┐
                        │                Nuxt app (Node)               │
  Browser  ── HTTP ──▶  │  Vue 3 / SSR pages  ──▶  Nitro server routes │  ──▶  PokéAPI (cached)
  (cookie session)      │                          (/api/*)            │  ──▶  SQLite (Prisma)
                        └─────────────────────────────────────────────┘
```

Rationale for one deployable over a separate API service is recorded in
[ADR 0001](./adr/0001-nuxt-fullstack-over-separate-api.md). The short version: the scope does not
justify a second service, and Nitro is a real Node server. We still draw clean internal
boundaries so the API could be lifted out later without rework.

## Design principles

The choices below all serve one goal: **the system can be extended without rework as it grows.**

- **Boundaries over shortcuts.** Each layer has a single responsibility and depends only downward
  (handlers → services → repositories). New endpoints reuse existing services; new data sources
  swap behind a repository; the API could be extracted by relocating layers, not rewriting them.
- **One source of truth per concept.** DTO types are defined once and shared front to back;
  business rules (e.g. Grass → shiny) and the PokéAPI/type-color mappings live in exactly one place,
  so a change happens in one file, not many.
- **Reusable, documented primitives.** Cross-cutting behaviour (validation, error shaping, the auth
  guard, the cached upstream client) is factored into shared utilities rather than repeated per
  route.
- **Secure and correct by construction.** Inputs are validated at the boundary and persistence is
  parameterized, so the safe path is the default path (see [07-security](./07-security.md)).

## Server layering

The Nitro server is deliberately layered like a standalone API. Each layer has one job; the
dependency direction only ever points downward.

```
server/
  api/                     HTTP boundary: routing, auth guard, validation, status codes
    pokemon/
      index.get.ts         GET /api/pokemon        (list)
      [name].get.ts        GET /api/pokemon/:name  (detail)
    collection/
      index.get.ts         GET /api/collection
      index.post.ts        POST /api/collection    (catch)
      [pokemonId].delete.ts DELETE /api/collection/:pokemonId (release)
    auth/
      register.post.ts     POST /api/auth/register
      login.post.ts        POST /api/auth/login
      logout.post.ts       POST /api/auth/logout
  services/                Business logic. Framework-agnostic, pure where possible.
    pokemon.service.ts     shaping PokéAPI → our DTO; the Grass → shiny rule
    collection.service.ts  catch/release/list orchestration
    auth.service.ts        register/login (hashing via nuxt-auth-utils)
  repositories/            Data access. The only layer that talks to Prisma.
    collection.repository.ts
    user.repository.ts
  utils/
    pokeapi.ts             upstream HTTP client + cache
    validation.ts          Zod schemas (shared with client via types)
    errors.ts              error helpers
  db/
    client.ts              Prisma client singleton
```

Handlers stay thin, logic is unit-testable in isolation, and swapping the data source or promoting
the API to its own service means moving `services/` + `repositories/` rather than rewriting them.

### Layer responsibilities

- **`api/` (handlers)** — parse and validate input (Zod), enforce auth, call one service, map the
  result to an HTTP response/status. No business logic, no Prisma.
- **`services/`** — all domain logic. Owns the Grass → shiny rule and DTO shaping. Depends on
  repositories and utils, never on HTTP objects.
- **`repositories/`** — all persistence. Returns domain objects, hides Prisma specifics.
- **`utils/pokeapi.ts`** — the single place that knows PokéAPI's URL shape and caching.

## Key request flows

### Browse list — `GET /api/pokemon?limit&offset&search&type`
1. Handler validates pagination/search/type params.
2. `pokemon.service` selects the source: the paginated list endpoint (default), a single name
   lookup (`search`), or a type's members (`type`, via PokéAPI's `type/{name}` endpoint) — all
   served from cache when warm.
3. Service shapes each entry into our list DTO (id, name, sprite, types) and returns a uniform page.
4. Handler returns `{ items, total, limit, offset }`.

### Detail + Grass rule — `GET /api/pokemon/:name`
1. Handler validates the name.
2. `pokemon.service` fetches the Pokémon (cached), maps to the detail DTO, converts height
   decimetres → metres, flags hidden abilities.
3. **Business rule:** if any `types[].type.name === "grass"`, the DTO includes
   `shinySpriteUrl`; otherwise that field is `null`. Expressed once here, unit-tested directly.
4. Handler returns the DTO.

### Catch — `POST /api/collection`
1. Auth guard requires a session (else 401).
2. Handler validates the body (`{ pokemonId }`).
3. `collection.service` upserts `(userId, pokemonId)` with `caughtAt = now` — idempotent per
   [AC-5.3](./01-requirements.md).
4. Handler returns the collection entry.

## PokéAPI integration & caching

PokéAPI is public, immutable, and rate-limited; the same Pokémon is requested repeatedly. So:

- All upstream access goes through `server/utils/pokeapi.ts`.
- Responses are cached with a TTL (Pokémon data effectively never changes, so TTL is long).
  Implementation: Nitro's built-in cache (`cachedFunction` / storage layer) to avoid pulling in a
  cache dependency. In-memory is fine for this scope; the boundary allows swapping to Redis later.
- Height/weight unit conversion and DTO shaping happen server-side so the client receives
  ready-to-render data and no upstream shape leaks into Vue components.

## Cross-cutting concerns

- **Validation:** every request body/param is parsed with a Zod schema at the handler boundary.
  Invalid input → `400` with a structured error. Schemas double as the source of shared types.
- **Errors:** one error model (`{ statusCode, message, ... }`) via Nitro's `createError`; handlers
  never leak raw upstream/DB errors or stack traces to clients.
- **Auth guard:** a small server helper reads the session (`nuxt-auth-utils`) and throws `401`
  when absent; used by all collection routes. Details in [ADR 0003](./adr/0003-session-auth-strategy.md).
- **Config:** upstream base URL, session secret, and DB URL come from runtime config / `.env`;
  nothing secret is committed.
- **Security:** validation, session hardening, authorization scoping, rate limiting, and security
  headers are treated as a cross-cutting concern with its own spec — see [07-security](./07-security.md).

## Type sharing

DTO types live in a shared location (e.g. `shared/types` or `types/`) and are imported by both the
service layer and the Vue/composable layer. One definition of `PokemonDetail`, `CollectionEntry`,
etc., front to back — a change to a contract is a compile error on both sides.
# Tasks

The implementation plan, broken into workable pieces and ordered by dependency. Each task traces
back to the specs and, where relevant, the acceptance criteria (AC) in
[01-requirements](./01-requirements.md).

## Working conventions (multi-session)

- This file is the source of truth for progress. At the start of a session, read it and pick the
  next unchecked task whose dependencies are met.
- Mark `[~]` when a task is in progress, `[x]` when its "done when" is satisfied.
- Keep tasks small enough to finish (and ideally commit) within a session. Split anything that
  grows past that.

### Git workflow

- Work each phase on its own branch (`phase-N-short-name`) off `main`; never commit features
  directly to `main`.
- Commit at meaningful checkpoints with messages referencing the phase/task.
- Merge via a pull request. Before merging, do a **final self-review** of the diff — correctness,
  security against [07](./07-security.md), and adherence to the specs — treating it as the gate a
  reviewer would apply. Squash or keep history clean; resolve conflicts deliberately.

Status key: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Project scaffold & tooling
*Depends on: nothing. Goal: an empty app that runs, type-checks, and lints.*

- [x] Initialize Nuxt app with TypeScript (strict) and pnpm — Nuxt 4.5.2, Node 22 pinned via `.nvmrc`, pnpm 12
- [x] Add ESLint + Prettier with a single agreed config; `lint` and `typecheck` scripts — `@nuxt/eslint` flat config (stylistic off), Prettier owns formatting
- [x] Add Vitest and Playwright with `test` / `test:e2e` scripts (no real tests yet) — Vitest + `@nuxt/test-utils` (sanity test), Playwright configured across Chromium/Firefox/WebKit (smoke spec)
- [x] Set up runtime config / `.env` handling (PokéAPI base URL, session secret, `DATABASE_URL`); commit `.env.example`, gitignore `.env` — `runtimeConfig.pokeApiBaseUrl`; DB/session vars documented as later-phase in `.env.example`
- [x] Establish shared types location (e.g. `shared/types`) importable by server and client — `shared/types/index.ts` pre-populated with the API-contract DTOs
- **Done when:** `pnpm dev`, `pnpm typecheck`, and `pnpm lint` all succeed on a clean checkout. ✅ typecheck/lint/format/test/build all green; built server returns 200 rendering the app.

## Phase 1 — Data layer
*Depends on: 0. Spec: [03-data-model](./03-data-model.md).*

- [x] Add Prisma; configure SQLite datasource — Prisma 6.19.3 (pinned to stable 6.x; 7.x/8.x are too new/RC)
- [x] Model `User` and `CaughtPokemon` per the schema (unique `(userId, pokemonId)`, cascade delete, `userId` index)
- [x] Create initial migration; add `db:migrate` script — `20260923195837_init` applied; `db:migrate`/`db:generate`/`db:migrate:deploy`/`db:studio` scripts added
- [x] Add Prisma client singleton (`server/db/client.ts`)
- [x] Implement `user.repository` and `collection.repository` (all queries scoped by `userId`)
- [ ] Optional: `db:seed` script creating a demo user — **deferred to Phase 4**: seeding a login-able user needs the same password hashing the app uses (`nuxt-auth-utils`), which lands with auth
- **Done when:** migration applies cleanly and repositories are exercised by a quick unit test against a throwaway DB. ✅ 5 repository tests (create/find, catch idempotency, user-scoping, idempotent release, cascade delete) pass against a temp SQLite DB; typecheck/lint/format green.

## Phase 2 — PokéAPI integration & caching
*Depends on: 0. Spec: [02-architecture](./02-architecture.md) (caching), [04-api-contract](./04-api-contract.md) (DTOs).*

- [x] Implement `server/utils/pokeapi.ts` client (list, detail, and `type/{name}` members fetch) with typed upstream shapes — outbound names/types encoded (SSRF guard)
- [x] Add caching (Nitro `defineCachedFunction`) with a long TTL (24h; Pokémon data is effectively immutable)
- [x] Implement `pokemon.service`: map upstream → `PokemonListItem` / `PokemonDetail`
- [x] List source selection in the service: default page vs. name lookup (`search`) vs. type members (`type`); search precedence over type
- [x] Height dm→m and weight hg→kg conversions
- [x] Hidden-ability flagging
- [x] **Shiny-form business rule** (data-driven `SHINY_TYPES`, currently Grass): `hasShinyForm` + `shinySpriteUrl` (null when the rule doesn't apply) — AC-3.4
- **Done when:** service unit tests pass for grass / grass+secondary / non-grass, unit conversions, and the three list-source branches, with the upstream client mocked. ✅ 9 service tests pass (15 total); typecheck/lint/format green.

## Phase 3 — Pokémon API endpoints
*Depends on: 2. Spec: [04-api-contract](./04-api-contract.md).*

- [x] `GET /api/pokemon` (limit/offset/search/type validated with Zod; unknown `type` → `400`) — AC-1.1, AC-2.1/2.2 — type validated against shared `POKEMON_TYPES` enum
- [x] `GET /api/pokemon/:name` returning `PokemonDetail`; `404` on unknown — AC-3.1–3.4
- [x] Uniform error model via `createError`; no upstream shape leakage (upstream failures → `502`)
- **Done when:** integration tests cover validation (`400`, incl. unknown type), not-found (`404`), and happy-path DTO shape (default/search/type) with upstream stubbed. ✅ 11 endpoint tests (26 total); also verified live: list shape, grass→shiny vs non-grass, 400 on bad type, 404 on unknown Pokémon.

## Phase 4 — Authentication
*Depends on: 1. Spec: [04-api-contract](./04-api-contract.md) (auth), [ADR 0003](./adr/0003-session-auth-strategy.md), [07-security](./07-security.md).*

- [x] Add `nuxt-auth-utils` (0.5.30); configure session secret via `NUXT_SESSION_PASSWORD`
- [x] `POST /api/auth/register` (hash password, set session, `409` on duplicate — check + unique-constraint fallback) — AC-4.1
- [x] `POST /api/auth/login` (verify, set session, generic `401`) — AC-4.2
- [x] `POST /api/auth/logout` (clear session) — AC-4.2
- [x] Server auth guard helper (`requireUser`) → `401` for unauthenticated protected requests — AC-4.3
- [x] Cookie/session hardening: httpOnly + `Secure` (prod) defaults, `SameSite=Lax` explicit, 7-day maxAge; generic auth errors (no enumeration) — [07](./07-security.md)
- [x] Rate limit `login`/`register` against credential stuffing (in-memory fixed-window; production → shared store) — [07](./07-security.md)
- [ ] ~~Demo-user seed~~ (deferred from Phase 1): **not built as a DB script** — nuxt-auth-utils' hashing is a Nitro auto-import, not importable standalone, so users are only created through the app's auth path (one hashing source of truth). README documents registering a demo account.
- **Done when:** integration tests cover register/login/logout, the guard rejecting anonymous requests, and login returning a generic error. ✅ 11 auth tests (rate-limit, guard, register/login/logout, generic-401) — 37 total; also verified live: 201/409/400 register, session persistence, 204 logout + clear, 401 wrong/200 correct login, httpOnly sealed cookie.

## Phase 5 — Collection API
*Depends on: 1, 2, 4. Spec: [04-api-contract](./04-api-contract.md).*

- [x] `POST /api/collection` — resolve display fields via cached PokéAPI, upsert `(userId, pokemonId)` (idempotent), `caughtAt` server-set; `404` on unknown id — AC-5.1–5.3
- [x] `GET /api/collection` — session user's entries, newest first — AC-6.1–6.3
- [x] `DELETE /api/collection/:pokemonId` — idempotent release — AC-7.1
- [x] Rate limit `catch` (per user; protects us and the upstream); `pokemonId` validated + encoded into the upstream request — [07](./07-security.md)
- **Done when:** integration tests cover catch idempotency, user-scoping (never returns another user's rows), and release. ✅ 13 tests (service mapping + endpoints incl. 401 guard on all three, 400, 404) — 51 total; also verified live: 201 catch + idempotent, 404 bad id, newest-first list with resolved fields, 204 release, 401 unauthenticated.

## Phase 6 — Frontend foundation
*Depends on: 0. Spec: [05-frontend-ux](./05-frontend-ux.md).*

- [x] Install & configure **Nuxt UI** (4.11.2); app shell via `<UApp>` + layout + `UContainer`/`UButton`
- [x] Design tokens (Pokémon type-color map in `app/utils/pokemonTypes.ts`); Nuxt UI themed via `app.config.ts` (red primary / slate neutral)
- [x] App layout + `AppHeader` (auth-aware nav via `useUserSession`)
- [x] Routing skeleton for all pages; protected-route middleware → `/login`
- [x] Reusable `TypeBadge` (label + color, from the type-color map)
- [x] Security headers / CSP via Nitro `routeRules` (nosniff, Referrer-Policy, X-Frame-Options always; CSP production-only) — [07](./07-security.md)
- **Done when:** all routes resolve, the header reflects logged-out state, the protected-route redirect works, components render through the themed Nuxt UI base, and security headers are present on responses. ✅ verified live: `/` 200 with logged-out nav, `/collection` → 302 `/login`, all four security headers present (CSP in the prod build).

## Phase 7 — Browse & search UI
*Depends on: 3, 6. Spec: [05-frontend-ux](./05-frontend-ux.md).*

- [x] `PokemonCard`, `PokemonGrid` with all four states: loading (skeletons), empty, error + retry, success
- [x] `/` fetches `GET /api/pokemon` via `useFetch`, query bound to URL — AC-1.1, AC-1.2
- [x] `Pagination` (`UPagination`) bound to the URL `page` (→ `limit`/`offset`)
- [x] `SearchBar` (debounced 300ms) driving the `q` query; friendly no-match state — AC-2.1/2.2
- [x] `TypeFilter` driving the `type` query; composes with search + pagination; resets page on change
- **Done when:** browsing, paging (with back/forward), searching, and type filtering all work against the live API, with loading/empty/error states visible. ✅ verified live via SSR: grid renders, `?q=pikachu` finds it, `?q=notarealmon` shows empty state, `?type=grass` filters (no charmander), `?page=2` pages. Note: shared imports in `app/` use the `#shared` alias (relative paths break the client bundle).

## Phase 8 — Detail UI
*Depends on: 3, 6. Spec: [05-frontend-ux](./05-frontend-ux.md).*

- [x] `/pokemon/[name]` renders name, height (m), weight (kg), abilities (hidden tagged), types — AC-3.1–3.3
- [x] `ShinyImage` shown only when `hasShinyForm` (and `shinySpriteUrl` present), clearly labelled — AC-3.4
- [x] `404` name renders the not-found state (other errors + loading skeleton handled too)
- **Done when:** a grass and a non-grass Pokémon both render correctly (shiny present / absent). ✅ verified live (see Phase 10 smoke).

## Phase 9 — Auth UI
*Depends on: 4, 6. Spec: [05-frontend-ux](./05-frontend-ux.md).*

- [x] `/register` and `/login` (shared `AuthForm`) posting to the auth endpoints; server error display; redirect-back after auth (open-redirect guarded)
- [x] Header reflects logged-in state; logout clears session (from Phase 6 `AppHeader`); `auth` middleware now passes a `redirect` query
- **Done when:** a user can register, log out, and log back in through the UI. ✅ verified live (see Phase 10 smoke).

## Phase 10 — Collection UI & catch flow
*Depends on: 5, 7, 8, 9. Spec: [05-frontend-ux](./05-frontend-ux.md).*

- [x] `useCollectionStore` (Pinia): hydrate from `GET /api/collection`; holds caught ids + entries
- [x] `CatchButton` with optimistic toggle + rollback on error; prompts login when logged out — AC-5.4
- [x] Catch confirmation micro-interaction (card pop + toast), gated on `prefers-reduced-motion`
- [x] `/collection` renders `CollectionList`/`CollectionItem` with human-readable caught-at — AC-6.1/6.2
- [x] Release action updates the store optimistically — AC-7.1
- **Done when:** catching on grid/detail reflects instantly with the confirmation (and an instant fallback under reduced-motion), the collection page shows entries + times, and release works. ✅ verified live end-to-end: logged in, caught Bulbasaur (button → "Caught ✓", card highlight + "Gotcha!" toast), `/collection` showed the entry with "Caught 11 seconds ago", and Release returned the empty state. Backend confirmed via API smoke (register 201 → catch 201 → list → release 204 → empty).

## Phase 11 — Test coverage completion
*Depends on: features above. Spec: [06-testing-quality](./06-testing-quality.md).*

- [ ] Fill any gaps in service/repository unit tests (esp. the grass rule)
- [ ] Fill any gaps in API integration tests (validation, auth guard, status codes)
- [ ] Playwright E2E: register → browse → open → catch → see in collection
- [ ] Playwright guard check: `/collection` while logged out → `/login`
- [ ] Configure Playwright projects for Chromium, Firefox, and WebKit so the E2E path runs on all three engines
- **Done when:** `pnpm test` and `pnpm test:e2e` pass locally across all three browser engines.

## Phase 12 — CI, polish & README
*Depends on: 11.*

- [ ] GitHub Actions: install → lint → typecheck → unit/integration → `pnpm audit` → build
- [ ] Accessibility/responsive pass against the [05](./05-frontend-ux.md) UX bar: alt text, keyboard/focus, non-color-only cues, `prefers-reduced-motion`, error+retry states, mobile reflow
- [ ] Final security review of the shipped code against [07](./07-security.md)
- [ ] Root `README.md` (personal voice): quick-start, why spec-driven development, how AI tooling was directed *and validated*, note on the depth to work without it, how requirements were taken to the intended outcome (not the literal request), architecture summary linking to `specs/`, ADR list, "productionizing / with more time" notes
  - "With more time" candidate: **client bundle analysis** (`nuxi analyze`). The production client is ~24 tree-shaken chunks (~980 KB raw / ~300 KB gzip), most of it Nuxt UI + the Vue runtime; unused library code (e.g. the date-picker) is already dropped. Not a bug — a trimming opportunity if bundle size ever matters.
- **Done when:** CI is green and a fresh clone runs from the README instructions alone.
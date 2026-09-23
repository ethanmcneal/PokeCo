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

- [ ] Implement `server/utils/pokeapi.ts` client (list, detail, and `type/{name}` members fetch) with typed upstream shapes
- [ ] Add caching (Nitro `cachedFunction` / storage) with a long TTL
- [ ] Implement `pokemon.service`: map upstream → `PokemonListItem` / `PokemonDetail`
- [ ] List source selection in the service: default page vs. name lookup (`search`) vs. type members (`type`)
- [ ] Height dm→m and weight hg→kg conversions
- [ ] Hidden-ability flagging
- [ ] **Grass → shiny business rule**: `isGrassType` + `shinySpriteUrl` (null when not grass) — AC-3.4
- **Done when:** service unit tests pass for grass / grass+secondary / non-grass, unit conversions, and the three list-source branches, with the upstream client mocked.

## Phase 3 — Pokémon API endpoints
*Depends on: 2. Spec: [04-api-contract](./04-api-contract.md).*

- [ ] `GET /api/pokemon` (limit/offset/search/type validated with Zod; unknown `type` → `400`) — AC-1.1, AC-2.1/2.2
- [ ] `GET /api/pokemon/:name` returning `PokemonDetail`; `404` on unknown — AC-3.1–3.4
- [ ] Uniform error model via `createError`; no upstream shape leakage
- **Done when:** integration tests cover validation (`400`, incl. unknown type), not-found (`404`), and happy-path DTO shape (default/search/type) with upstream stubbed.

## Phase 4 — Authentication
*Depends on: 1. Spec: [04-api-contract](./04-api-contract.md) (auth), [ADR 0003](./adr/0003-session-auth-strategy.md), [07-security](./07-security.md).*

- [ ] Add `nuxt-auth-utils`; configure session secret
- [ ] `POST /api/auth/register` (hash password, set session, `409` on duplicate) — AC-4.1
- [ ] `POST /api/auth/login` (verify, set session, generic `401`) — AC-4.2
- [ ] `POST /api/auth/logout` (clear session) — AC-4.2
- [ ] Server auth guard helper → `401` for unauthenticated protected requests — AC-4.3
- [ ] Cookie/session hardening: httpOnly, `SameSite`, `Secure` in production; generic auth errors (no enumeration) — [07](./07-security.md)
- [ ] Rate limit `login`/`register` against credential stuffing — [07](./07-security.md)
- **Done when:** integration tests cover register/login/logout, the guard rejecting anonymous requests, and login returning a generic error.

## Phase 5 — Collection API
*Depends on: 1, 2, 4. Spec: [04-api-contract](./04-api-contract.md).*

- [ ] `POST /api/collection` — resolve display fields via cached PokéAPI, upsert `(userId, pokemonId)` (idempotent), `caughtAt` server-set — AC-5.1–5.3
- [ ] `GET /api/collection` — session user's entries, newest first — AC-6.1–6.3
- [ ] `DELETE /api/collection/:pokemonId` — idempotent release — AC-7.1
- [ ] Rate limit `catch` (protects us and the upstream); ensure `pokemonId` is validated/encoded into the upstream request — [07](./07-security.md)
- **Done when:** integration tests cover catch idempotency, user-scoping (never returns another user's rows), and release.

## Phase 6 — Frontend foundation
*Depends on: 0. Spec: [05-frontend-ux](./05-frontend-ux.md).*

- [ ] Install & configure **Nuxt UI**; establish the app shell using its primitives
- [ ] Design tokens (spacing, type scale, Pokémon type-color map); theme Nuxt UI with them
- [ ] App layout + `AppHeader` (auth-aware nav via `useUserSession`)
- [ ] Routing skeleton for all pages; protected-route middleware → `/login`
- [ ] Reusable `TypeBadge` (label + color, from the type-color map)
- [ ] Security headers / CSP via Nitro route rules — [07](./07-security.md)
- **Done when:** all routes resolve, the header reflects logged-out state, the protected-route redirect works, components render through the themed Nuxt UI base, and security headers are present on responses.

## Phase 7 — Browse & search UI
*Depends on: 3, 6. Spec: [05-frontend-ux](./05-frontend-ux.md).*

- [ ] `PokemonCard`, `PokemonGrid` with all four states: loading (skeletons), empty, error + retry, success
- [ ] `/` fetches `GET /api/pokemon` via `useFetch`, query bound to URL — AC-1.1, AC-1.2
- [ ] `Pagination` bound to `limit`/`offset` in the URL
- [ ] `SearchBar` (debounced) driving the `search` query; friendly no-match state — AC-2.1/2.2
- [ ] `TypeFilter` driving the `type` query; composes with search + pagination; resets `offset` on change
- **Done when:** browsing, paging (with back/forward), searching, and type filtering all work against the live API, with loading/empty/error states visible.

## Phase 8 — Detail UI
*Depends on: 3, 6. Spec: [05-frontend-ux](./05-frontend-ux.md).*

- [ ] `/pokemon/[name]` renders name, height (m), abilities (hidden tagged), types — AC-3.1–3.3
- [ ] `ShinyImage` shown only when `isGrassType`, clearly labelled — AC-3.4
- [ ] `404` name renders the not-found state
- **Done when:** a grass and a non-grass Pokémon both render correctly (shiny present / absent).

## Phase 9 — Auth UI
*Depends on: 4, 6. Spec: [05-frontend-ux](./05-frontend-ux.md).*

- [ ] `/register` and `/login` forms posting to the auth endpoints; error display
- [ ] Header reflects logged-in state; logout clears session
- **Done when:** a user can register, log out, and log back in through the UI.

## Phase 10 — Collection UI & catch flow
*Depends on: 5, 7, 8, 9. Spec: [05-frontend-ux](./05-frontend-ux.md).*

- [ ] `useCollectionStore` (Pinia): hydrate from `GET /api/collection`; holds caught ids + entries
- [ ] `CatchButton` with optimistic toggle + rollback on error; prompts login when logged out — AC-5.4
- [ ] Catch confirmation micro-interaction (Poké Ball / card settle + toast), gated on `prefers-reduced-motion`
- [ ] `/collection` renders `CollectionList`/`CollectionItem` with human-readable caught-at — AC-6.1/6.2
- [ ] Release action updates the store optimistically — AC-7.1
- **Done when:** catching on grid/detail reflects instantly with the confirmation (and an instant fallback under reduced-motion), the collection page shows entries + times, and release works.

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
- **Done when:** CI is green and a fresh clone runs from the README instructions alone.
# PokéCo

A small full-stack Pokémon reference app: browse and search the Pokédex, open a
Pokémon to see its details, and — once signed in — catch Pokémon into your own
collection with a caught-at timestamp. Built with Nuxt (Vue 3 + Nitro),
TypeScript, Prisma/SQLite, and Nuxt UI.

The brief was deliberately open, so I treated it as a design problem first and a
coding problem second: the reasoning lives in [`specs/`](./specs), and the code
implements it. This README is the orientation; the specs are the detail.

## Quick start

Prerequisites: **Node 22** (`.nvmrc`) and **pnpm** (via Corepack).

```bash
nvm use                      # Node 22 (see .nvmrc)
corepack enable              # provides the pinned pnpm

pnpm install                 # installs deps; runs prisma generate + nuxt prepare

cp .env.example .env         # then set NUXT_SESSION_PASSWORD (min 32 chars):
#   openssl rand -base64 32

pnpm db:migrate              # creates prisma/dev.db from the migration
pnpm dev                     # http://localhost:3000
```

Then register an account in the app and start catching.

### Everyday scripts

| Command                           | What it does                                               |
| --------------------------------- | ---------------------------------------------------------- |
| `pnpm dev`                        | Dev server with HMR                                        |
| `pnpm test`                       | Unit + integration tests (Vitest)                          |
| `pnpm test:e2e`                   | End-to-end journeys (Playwright, Chromium/Firefox/WebKit)¹ |
| `pnpm typecheck`                  | `vue-tsc` in strict mode                                   |
| `pnpm lint` / `pnpm format:check` | ESLint / Prettier                                          |
| `pnpm build` && `pnpm preview`    | Production build and local preview                         |

¹ First run needs the browser binaries: `pnpm exec playwright install`.

## What it does

- **Browse & discover** — a paginated grid of Pokémon (sprite, name, types),
  sourced from [PokéAPI](https://pokeapi.co/) and shaped for the UI.
- **Search & filter** — case-insensitive **substring** search (`mag` → magnemite,
  magneton, magmar) that **composes** with a type filter and pagination; all of it
  lives in the URL so views are shareable and back/forward-safe.
- **Detail view** — name, height, weight, abilities (hidden ones tagged), types,
  a Pokédex description, and the genus. If the Pokémon is a Grass type, its
  **shiny form** is shown alongside the default sprite.
- **Catch & collect** — authenticated users catch Pokémon into a per-user
  collection (independent of other users) with a caught-at time; catching is
  optimistic with rollback, and release asks for confirmation.

## Why spec-driven development

I wrote the specs before the code because the brief's real difficulty isn't any
single feature — it's the decisions around them (where the domain logic lives,
how auth and persistence are modelled, what "if Grass, show shiny" really means).
Writing those down first meant:

- the hard thinking happened once, in prose, where it's cheap to change;
- each phase had an explicit "done when", so scope didn't drift;
- and every non-obvious call is reviewable on its own, not reverse-engineered
  from a diff.

The specs use "we"; this README is where I speak in the first person about how I
worked.

## Directing (and validating) AI tooling

I used AI assistance throughout, but the leverage came from **direction and
verification**, not delegation:

- **Decomposition** — I broke the work into phases with acceptance criteria
  (`specs/tasks.md`) and drove them one at a time, rather than asking for "an app".
- **Specs as the contract** — the AI implemented against the specs I wrote; when
  output drifted from them, the spec was the source of truth, not the code.
- **Validation over trust** — every phase was gated on `typecheck`, `lint`, the
  test suite, a production build, and manual verification in the browser. A few
  examples of catches that mattered: pinning Prisma to a stable major instead of
  the `latest` release-candidate; moving `#auth-utils` type augmentation so Nuxt's
  split TS projects picked it up; and switching app→shared imports to the `#shared`
  alias after relative paths broke the client bundle.
- **Interpreting intent** — see below.

## Requirements → intended outcome (not the literal request)

A few places where the literal brief and the _useful_ behaviour diverged, and I
chose the outcome:

- **"If the Pokémon is a Grass type, show its shiny form."** I scoped this to the
  detail view (where the brief lists it alongside height/abilities) and show it
  _additively_ next to the canonical sprite. Browse and collection stay canonical
  — recolouring only Grass entries in a scanning grid hurts recognisability. The
  rule is a data-driven policy set (`SHINY_TYPES`), not a hard-coded `=== 'grass'`,
  so it's testable and trivially extendable.
- **Search.** "Search by name" as an exact match is technically correct and nearly
  useless. I made it a substring match that composes with the type filter, and
  excluded PokéAPI's alternate battle forms so results stay to standard dex entries.
- **Catch semantics.** "Catch into a collection" implied identity, per-user
  isolation, and a timestamp — so the collection (not the read-only PokéAPI proxy)
  is where the real domain modelling went.

## Architecture at a glance

Nuxt full-stack: the Vue app and the Nitro API ship as one deployable, sharing
types across the boundary. Requests flow **route handler → service → repository /
upstream client**, so HTTP, business logic, and data access stay separated.

```
app/            Vue 3 pages & components (browse, detail, auth, collection)
server/
  api/          Nitro route handlers — validate, delegate, map errors
  services/     business logic (the shiny rule, search, catch)
  repositories/ Prisma data access, always user-scoped
  utils/        PokéAPI client (cached), auth, rate limiting, validation
shared/         DTOs shared by client and server (one source of truth)
prisma/         schema + migrations (SQLite)
specs/          the design: requirements, architecture, data model, API,
                UX, testing, security, and ADRs
```

Full detail: [architecture](./specs/02-architecture.md),
[data model](./specs/03-data-model.md), [API contract](./specs/04-api-contract.md),
[frontend/UX](./specs/05-frontend-ux.md).

### Decision records

- [ADR 0001 — Nuxt full-stack over a separate API service](./specs/adr/0001-nuxt-fullstack-over-separate-api.md)
- [ADR 0002 — SQLite + Prisma for persistence](./specs/adr/0002-sqlite-prisma-persistence.md)
- [ADR 0003 — Session auth over a managed identity provider](./specs/adr/0003-session-auth-strategy.md)

## Testing

Targeted, not exhaustive — cover the business rules and the critical path well
(strategy in [06-testing-quality](./specs/06-testing-quality.md)):

- **Unit** (Vitest) — services & repositories: the shiny rule, unit conversions,
  DTO shaping, search/compose logic, catch/release idempotency, and user-scoping
  against a throwaway SQLite DB.
- **Integration** — Nitro handlers with the upstream stubbed: validation → `400`,
  the auth guard → `401`, and the documented success codes/shapes.
- **End-to-end** (Playwright) — the critical journey (register → browse → open →
  catch → see it in the collection) plus the logged-out `/collection` → `/login`
  guard, run across **Chromium, Firefox, and WebKit**.

CI (GitHub Actions, `.github/workflows/ci.yml`) runs install → lint → format →
typecheck → tests → `pnpm audit` → build on every push and PR.

## Security

Details in [07-security](./specs/07-security.md). Highlights: per-user
authorization scoping on every collection query; generic `401`s with a decoy-hash
compare to avoid user enumeration and timing side-channels; Zod validation at
every input boundary; sealed httpOnly session cookies (`SameSite=Lax`); an
outbound-URL guard on PokéAPI calls; security headers with a production CSP; a
pnpm build-script allowlist as a supply-chain control; and an open-redirect guard
on the post-auth redirect.

## Productionizing / with more time

- **Config for a real deploy.** The standalone server needs `NUXT_SESSION_PASSWORD`
  and an absolute `DATABASE_URL` in its environment (`nuxt dev`/`nuxt preview` load
  `.env`; a bare `node .output/server/index.mjs` does not).
- **Postgres over SQLite** for concurrent writes (the Prisma model ports directly).
- **Nonce-based CSP** to drop `'unsafe-inline'` for scripts/styles.
- **Bundle analysis** (`nuxi analyze`). The production client is ~24 tree-shaken
  chunks (~980 KB raw / ~300 KB gzip), mostly Nuxt UI + the Vue runtime; unused
  library code is already dropped — a trimming opportunity, not a bug.
- **E2E in CI** behind a stubbed PokéAPI, so the cross-browser suite runs without a
  live network dependency.

# 06 — Testing & Quality

Tests and tooling are a deliverable here, not an afterthought. The strategy is targeted, not
exhaustive: cover the business rules and the critical path well, and don't chase coverage numbers.

## Test pyramid

```
        ╱  E2E (Playwright)  ╲          1 flow: register → browse → catch → see in collection
      ╱   Integration (API)   ╲         Nitro handlers: validation, auth guard, status codes
    ╱   Unit (Vitest)           ╲       Services & repositories: the real logic
```

### Unit — the logic (Vitest)
Where the domain lives, so where testing pays off most.

- **`pokemon.service`**
  - **The shiny-form rule** (AC-3.4): a type in `SHINY_TYPES` (currently Grass) → `hasShinyForm true`
    + non-null `shinySpriteUrl`; otherwise `false` + `null`. This is the one explicit business rule
    in the requirements, so it gets dedicated cases (grass-only, grass+secondary type, non-grass).
  - Height decimetres → metres and weight hectograms → kg conversion.
  - Hidden-ability flagging; DTO shape (no upstream fields leak through).
  - Upstream client is mocked — these tests are pure and fast.
- **`collection.service`**
  - Catch is idempotent on `(userId, pokemonId)` (AC-5.3).
  - Release is idempotent.
- **`repositories`** — run against a throwaway SQLite test DB: user-scoping (a query never returns
  another user's rows — AC-6.3), unique constraint behaviour, cascade on user delete.

### Integration — the HTTP boundary
Exercise Nitro handlers with a test client:

- Validation: bad `limit`/`offset`/body → `400` with the structured error shape.
- Auth guard: collection endpoints without a session → `401`.
- Happy paths return the documented status codes (`201` catch, `204` release/logout, `404` unknown
  Pokémon) and DTO shapes from [04](./04-api-contract.md).
- PokéAPI is stubbed so tests are deterministic and offline.

### End-to-end — the critical path (Playwright)
One high-value journey proving the pieces integrate:

> Register → land on the browse grid → open a Pokémon → catch it → open My Collection → see it
> with a caught-at time.

Plus one guard check: visiting `/collection` while logged out redirects to `/login`.

All three engines are configured as Playwright projects. The default `pnpm test:e2e` runs
**Chromium and Firefox** (reliable on any machine); `pnpm test:e2e:all` adds **WebKit**, kept
opt-in because its Playwright browser build fails to launch on some environments (older macOS,
sandboxes). So the critical path is verified on multiple engines without a flaky default suite.

## What we deliberately don't test

- PokéAPI itself (it's a stubbed dependency).
- Exhaustive component snapshot tests — brittle, low value here. We test behaviour (the store's
  optimistic catch/rollback) over markup.
- Every field permutation — representative cases, not combinatorial.

## Quality gates & tooling

- **TypeScript strict** front to back; `nuxt typecheck` in CI. Type errors fail the build.
- **ESLint + Prettier** — one formatting/lint standard; no style debates in review.
- **Zod** at every input boundary — validation is enforced, not assumed.
- **`pnpm` scripts:** `dev`, `build`, `test` (Vitest), `test:e2e` (Playwright), `lint`, `typecheck`,
  `db:migrate`, `db:seed`.
- **CI (GitHub Actions):** install → lint → typecheck → unit/integration → build. E2E runnable
  locally (and in CI if time allows). A green pipeline gates the build.
- **Pre-commit hook** (optional, low-cost): lint + typecheck on staged files. Included only if it
  doesn't add friction — noted rather than assumed, in keeping with "no over-engineering."

## Definition of done (per feature)

A feature is done when: its acceptance criteria in [01](./01-requirements.md) are met; input is
validated; it has the tests appropriate to its layer (logic → unit, endpoint → integration,
critical path → E2E); it type-checks and lints clean; and any non-obvious decision is captured in
an ADR or the README.
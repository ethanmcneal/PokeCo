# 01 — Requirements

## Business brief (verbatim, condensed)

Build a web app for users to browse and explore Pokémon using the public [PokéAPI](https://pokeapi.co/).
"A simple Pokémon reference application that allows users to quickly find Pokémon and explore
information about them."

- Users can **browse and discover** Pokémon.
- Users can **catch** Pokémon, **build and view their own collection** (independent of other
  users), and **see when each Pokémon was caught**.
- Users can **explore additional information** about a Pokémon:
  - Minimum: **Name, Height, Abilities**
  - If the Pokémon is a **Grass type**, show its **shiny form**.

## Interpretation & scope

The brief is deliberately open. Our reading of where the real work is:

- **PokéAPI is a read-only external dependency.** Our value-add is *shaping* it into what the UI
  needs and *caching* it so we are a good API citizen — not proxying it blindly. Listing Pokémon
  and enriching each with a sprite/type would otherwise mean many upstream calls.
- **The collection is the domain we own.** "Catch," "per-user," "independent," and "caught-at
  timestamp" together require user identity + persistence + our own data model. This is where our
  own design work concentrates: API design, auth, and data modeling.
- **The Grass → shiny rule is a business rule**, not a UI detail. It lives in the server's service
  layer and is expressed once, so it can be tested and explained in isolation.
- **We scope the shiny form to the detail view**, where the brief lists it alongside Name / Height /
  Abilities as information you "explore about a Pokémon." The detail page shows the canonical sprite
  *and* a clearly labeled shiny form (additive, not a swap). Browse and collection deliberately keep
  the **canonical** sprite everywhere: those are scanning surfaces where recognizability matters, and
  recoloring only Grass types would make the grid inconsistent and harder to read. Accordingly, only
  the detail DTO carries `hasShinyForm` / `shinySpriteUrl`; the list DTO stays canonical-only.

### In scope

1. Browse a paginated list of Pokémon with name + sprite + type.
2. Search / jump to a Pokémon by name.
3. View a Pokémon detail page: name, height, abilities, types (+ shiny image for Grass types).
4. Register / log in / log out.
5. Catch a Pokémon (authenticated) and see it in "My Collection" with the caught-at time.
6. Release a Pokémon from the collection (collection management is implied by "build a collection").

### Deliberate enhancements (beyond the minimum)

Chosen for user-experience value at low scope cost, and treated with the same rigor as the required
features. Recorded here so the scope decision is explicit rather than incidental.

- **Filter the browse list by type.** Directly serves "quickly find Pokémon"; a more useful way to
  explore a Pokédex than paging alone, and it composes with search and pagination.
- **A catch confirmation micro-interaction.** Purposeful feedback on the app's core action,
  respecting `prefers-reduced-motion` (see [05](./05-frontend-ux.md)).
- **A shared accessible component base (Nuxt UI) + design tokens.** Baseline accessibility and
  consistency without reinventing primitives.

### Out of scope (deliberately, to avoid over-engineering)

- Social features, sharing, or seeing other users' collections.
- Full Pokédex data (moves, evolutions, stats, cries) beyond what the brief asks for. Detail
  fields are chosen to satisfy the brief plus a little tasteful enrichment (weight, types).
- Password reset / email verification / MFA — noted as production concerns in
  [ADR 0003](./adr/0003-session-auth-strategy.md), not built.
- Native mobile, offline mode, i18n.

## User stories & acceptance criteria

Written so each maps directly to a testable behavior.

### US-1 — Browse
> As a visitor, I can browse a list of Pokémon so I can discover them.

- **AC-1.1** The landing page shows a paginated grid of Pokémon (name + sprite + type badges).
- **AC-1.2** I can page forward/back; pagination state is reflected in the URL (shareable/back-button safe).
- **AC-1.3** List data is served by *our* API, which caches upstream PokéAPI responses.

### US-2 — Find
> As a visitor, I can search for a Pokémon by name so I can find one quickly.

- **AC-2.1** Entering a (partial) name filters to the matching Pokémon — a substring match, so
  `mag` surfaces magnemite, magneton, and magmar.
- **AC-2.2** A name with no match shows a friendly "not found" state, not an error.

### US-3 — Explore
> As a visitor, I can view detailed information about a Pokémon.

- **AC-3.1** The detail page shows **name, height, and abilities** at minimum.
- **AC-3.2** Height is presented in human units (meters), not raw decimeters.
- **AC-3.3** Abilities are listed by name; hidden abilities are indicated.
- **AC-3.4** **If the Pokémon is a Grass type, its shiny form image is shown.** Non-Grass Pokémon
  do not show a shiny image.

### US-4 — Authenticate
> As a user, I can create an account and log in so my collection is mine.

- **AC-4.1** I can register with email + password; the password is stored only as a hash.
- **AC-4.2** I can log in and log out; my session is an httpOnly cookie.
- **AC-4.3** Catch/collection endpoints reject unauthenticated requests (401).

### US-5 — Catch
> As a logged-in user, I can catch a Pokémon so it joins my collection.

- **AC-5.1** A "Catch" action on the list and detail views adds the Pokémon to my collection.
- **AC-5.2** The caught-at timestamp is recorded server-side.
- **AC-5.3** Catching a Pokémon I already own is idempotent (no duplicate, no error surfaced as failure).
- **AC-5.4** The UI reflects "caught" state without a full page reload.

### US-6 — View collection
> As a logged-in user, I can view my collection and when I caught each Pokémon.

- **AC-6.1** "My Collection" lists only *my* caught Pokémon.
- **AC-6.2** Each entry shows the Pokémon and its caught-at time (human-readable).
- **AC-6.3** Another user's collection is never visible to me (enforced server-side by session).

### US-7 — Release (collection management)
> As a logged-in user, I can remove a Pokémon from my collection.

- **AC-7.1** Releasing removes the entry; the list updates immediately.

## Requirements traceability

Every brief requirement maps to stories, an API surface, and the specs that detail it.

| Brief requirement | Story | Primary API | Detailed in |
|---|---|---|---|
| Browse & discover | US-1, US-2 | `GET /api/pokemon` | [04](./04-api-contract.md), [05](./05-frontend-ux.md) |
| Explore info (name/height/abilities) | US-3 | `GET /api/pokemon/:name` | [04](./04-api-contract.md) |
| Grass type → shiny form | US-3 (AC-3.4) | `GET /api/pokemon/:name` (server rule) | [02](./02-architecture.md), [04](./04-api-contract.md) |
| Catch + collection + per-user + timestamp | US-4, US-5, US-6 | `/api/auth/*`, `/api/collection` | [03](./03-data-model.md), [04](./04-api-contract.md) |
| Independent of other users | US-6 (AC-6.3) | session-scoped queries | [03](./03-data-model.md), [ADR 0003](./adr/0003-session-auth-strategy.md) |

## Non-functional requirements

- **Runnable in minutes:** `pnpm install && pnpm dev` with zero external infra (drives the SQLite
  and self-hosted-auth choices).
- **Type-safe end to end:** shared DTO types between server and client.
- **Good API citizen:** cache upstream PokéAPI; never hammer it on every page load.
- **Explainable:** every non-trivial decision is recorded in an ADR.
- **Tested:** business rules (esp. the Grass rule) and the catch flow are covered.
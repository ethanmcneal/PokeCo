# 05 — Frontend & UX

The frontend is Nuxt (Vue 3) with SSR. Data comes only from our own `/api`. This spec pins the
frontend patterns — data fetching, state ownership, and component boundaries — up front so the
implementation stays consistent and the rationale for each is explicit.

## Routes / pages

| Route | Page | Auth | Purpose |
|---|---|---|---|
| `/` | `pages/index.vue` | public | Browse grid + search + type filter + pagination (US-1, US-2) |
| `/pokemon/[name]` | `pages/pokemon/[name].vue` | public | Detail view + Grass shiny (US-3) |
| `/collection` | `pages/collection.vue` | protected | My Collection (US-6, US-7) |
| `/login` | `pages/login.vue` | public | Log in |
| `/register` | `pages/register.vue` | public | Register |

Protected routes use a route middleware that redirects to `/login` when there is no session.

## Component inventory

Kept small and composable; presentational components stay dumb (props in, events out). Interactive
primitives (buttons, inputs, modals/toasts, menus) come from the Nuxt UI base rather than being
hand-rolled — see [Design system](#design-system).

- **`PokemonCard`** — sprite, name, type badges, and a `CatchButton`. Emits nothing itself; used
  in the grid and search results.
- **`PokemonGrid`** — lays out `PokemonCard`s; handles loading (skeletons), empty, and error states.
- **`SearchBar`** — debounced name input; drives the `search` query param.
- **`TypeFilter`** — select/chips of Pokémon types; drives the `type` query param. Composable with
  search and pagination.
- **`Pagination`** — prev/next (+ page indicator) bound to `limit`/`offset` in the URL.
- **`TypeBadge`** — a colored type chip; also used to visually flag Grass.
- **`CatchButton`** — shows "Catch" / "Caught ✓"; disabled + prompts login when logged out;
  optimistic toggle on click, with the catch confirmation micro-interaction (see the catch flow).
- **`ShinyImage`** — renders the shiny sprite; only mounted when `isGrassType`.
- **`CollectionList`** / **`CollectionItem`** — collection rows with caught-at time + release.
- **`AppHeader`** — nav + auth state (login/register vs. email + logout + link to collection).

## State management

- **Auth/session:** `nuxt-auth-utils`' `useUserSession()` (`loggedIn`, `user`, `clear`). No custom
  auth store — the library owns session truth, available during SSR.
- **Collection:** a **Pinia store** (`useCollectionStore`) holding the set of caught `pokemonId`s
  plus the full entries. Why a store: "caught" state is read across the grid, detail page, and
  header, and must update reactively after a catch/release without refetching everything. The
  store hydrates from `GET /api/collection` on login/app load and mutates optimistically.
- Everything else (list pages, detail) is **server-fetched per route**, not global state.

## Data fetching patterns

- **Route data** uses `useAsyncData` / `useFetch` against `/api`, so it runs during SSR and
  hydrates cleanly:
  - `/` → `useFetch('/api/pokemon', { query: { limit, offset, search, type } })`, `query` bound to
    reactive refs from the URL so paging/searching/filtering refetch automatically.
  - `/pokemon/[name]` → `useFetch(\`/api/pokemon/\${name}\`)`; a `404` renders the not-found state.
- **Mutations** (catch/release, auth) use `$fetch` inside store actions / event handlers — not
  `useFetch` (which is for render-blocking data). After a mutation, the Pinia store updates
  optimistically and rolls back on error.
- Pagination, search, and type filter all live in the **URL query** ([AC-1.2](./01-requirements.md))
  so back/forward and sharing work; the fetch reacts to query changes. Changing search or type
  resets `offset` to 0.

## Key user flows

### Browse → explore
Grid on `/` → click a card → `/pokemon/[name]`. Detail shows name, height (m), abilities (hidden
ones tagged), types. **If Grass**, the `ShinyImage` appears with a clear "Shiny form" label; for
non-Grass it is absent (AC-3.4).

### Filter by type
The `TypeFilter` on `/` sets the `type` query param; the grid refetches `GET /api/pokemon?type=…`
and `offset` resets to 0. Type, search, and pagination compose and are all reflected in the URL, so
a filtered view is shareable and back-button safe. Clearing the filter returns to the full list.

### Catch (optimistic + confirmation)
Click `CatchButton` on a card or detail page:
1. If logged out → redirect/prompt to `/login`.
2. If logged in → store marks the id caught immediately (button flips to "Caught ✓"), fires
   `POST /api/collection`.
3. On success, reconcile with the returned entry; on failure, revert and show an error toast.
   Satisfies [AC-5.4](./01-requirements.md) (no full reload).
4. **Confirmation micro-interaction:** a brief, domain-tied catch animation (a Poké Ball / the card
   settling into "Caught ✓") plays on success. It is purely additive feedback — never blocks the
   action — and is **gated on `prefers-reduced-motion`**, falling back to an instant state change +
   toast for users who opt out of motion.

### View & manage collection
`/collection` renders `CollectionList` from the store (hydrated via `GET /api/collection`), each
row showing the Pokémon + a human-readable caught-at ("Caught 2 days ago" with exact time on
hover). Release removes the row optimistically (US-7).

### Auth
`/register` and `/login` post to the auth endpoints; on success the header reflects the logged-in
state and the collection store hydrates. Logout clears the session and the store.

## UX & accessibility bar

Treated as a first-class quality bar, not polish added at the end. Every data-driven view accounts
for all four states, and interaction is accessible by default:

- **State coverage:** each fetch renders **loading** (skeletons on the grid, not a bare spinner),
  **empty** ("No Pokémon found" / "No {type}-type Pokémon"), **error** (a message with a **retry**
  action, never a blank screen or raw error), and **success**. Mutations show pending/disabled
  states and roll back visibly on failure.
- **Keyboard & focus:** all interactive elements are reachable and operable by keyboard; focus is
  managed on navigation and in any overlay; the catch action exposes an accessible pressed/label
  state. Nuxt UI primitives provide correct roles/focus traps out of the box.
- **Non-visual cues:** sprites carry meaningful `alt` text (the Pokémon name); type badges use
  label + color, never color alone; nothing depends on hover.
- **Motion:** all animation (notably the catch confirmation) respects `prefers-reduced-motion`,
  degrading to instant state changes.
- **Responsive:** the grid reflows from multi-column down to mobile; touch targets stay adequate.

## Design system

Interactive primitives come from **Nuxt UI** (Tailwind-based, accessible components maintained by
the Nuxt team). We don't reimplement buttons, inputs, modals, menus, or toasts; effort goes into
the flows and the domain. Nuxt UI is themed intentionally with our own tokens — a small, consistent
set of spacing, type scale, and a Pokémon **type-color map** (shared by `TypeBadge` and
`TypeFilter`) — so the result reads as a deliberate design rather than library defaults.
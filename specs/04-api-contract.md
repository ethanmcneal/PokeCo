# 04 — API Contract

All endpoints are Nitro routes under `/api`. Requests/responses are JSON. Auth is a session
cookie set by `nuxt-auth-utils`; protected routes require it.

## Conventions

- **Validation:** bodies and query/path params are parsed with Zod at the handler. Failure → `400`.
- **Errors:** uniform shape via Nitro `createError`:
  ```json
  { "statusCode": 400, "statusMessage": "Bad Request", "message": "pokemonId must be a positive integer" }
  ```
- **Auth failures:** `401` when a session is required and absent.
- **Units:** height is returned in **metres** (converted from PokéAPI decimetres). Weight in **kg**.
- **IDs:** `pokemonId` is the PokéAPI numeric id.

## Shared DTOs

Defined once in shared types, imported by server and client.

```ts
interface PokemonListItem {
  id: number
  name: string
  spriteUrl: string | null
  types: string[]            // e.g. ["grass", "poison"]
}

interface Ability {
  name: string
  isHidden: boolean
}

interface PokemonDetail {
  id: number
  name: string
  heightM: number            // metres (converted from decimetres)
  weightKg: number           // kg (converted from hectograms)
  abilities: Ability[]
  types: string[]
  spriteUrl: string | null
  hasShinyForm: boolean      // result of the shiny-form rule (server SHINY_TYPES; currently Grass)
  shinySpriteUrl: string | null   // populated when hasShinyForm and upstream has one, else null — AC-3.4
}

interface CollectionEntry {
  pokemonId: number
  pokemonName: string
  spriteUrl: string | null
  caughtAt: string           // ISO 8601
}

interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

interface PublicUser {
  id: string
  email: string
}
```

---

## Pokémon (public, cached proxy)

### `GET /api/pokemon`
List Pokémon for the browse grid.

**Query:** `limit` (int, 1–100, default 20), `offset` (int, ≥0, default 0), `search` (optional
string), `type` (optional string — a valid Pokémon type, e.g. `grass`).

Sourcing depends on the params (handled in `pokemon.service`):

- **No `search`/`type`:** the paginated slice from PokéAPI's list endpoint.
- **`search`:** resolves the single matching Pokémon by name (case-insensitive) into a one-item
  page, or an empty page if no match (no error — [AC-2.2](./01-requirements.md)).
- **`type`:** the members of that type (from PokéAPI's `type/{name}` endpoint), paginated by
  `limit`/`offset`. An unknown `type` yields `400`.
- `search` takes precedence over `type` when both are supplied.

The response shape is identical in every case (`Page<PokemonListItem>`).

**200**
```json
{
  "items": [
    { "id": 1, "name": "bulbasaur", "spriteUrl": "https://.../1.png", "types": ["grass", "poison"] }
  ],
  "total": 1302,
  "limit": 20,
  "offset": 0
}
```

### `GET /api/pokemon/:name`
Detail for one Pokémon by name (or id).

- **200** → `PokemonDetail`. `hasShinyForm`/`shinySpriteUrl` follow the shiny-form rule (server `SHINY_TYPES`, currently Grass — AC-3.4).
- **404** if PokéAPI has no such Pokémon.

```json
{
  "id": 1,
  "name": "bulbasaur",
  "heightM": 0.7,
  "weightKg": 6.9,
  "abilities": [
    { "name": "overgrow", "isHidden": false },
    { "name": "chlorophyll", "isHidden": true }
  ],
  "types": ["grass", "poison"],
  "spriteUrl": "https://.../1.png",
  "hasShinyForm": true,
  "shinySpriteUrl": "https://.../shiny/1.png"
}
```

---

## Auth

### `POST /api/auth/register`
**Body:** `{ "email": string, "password": string }` (email valid; password min length enforced).
- **201** → `PublicUser`, session cookie set.
- **409** if the email is already registered.

### `POST /api/auth/login`
**Body:** `{ "email": string, "password": string }`.
- **200** → `PublicUser`, session cookie set.
- **401** on bad credentials (generic message — no user-enumeration).

### `POST /api/auth/logout`
- **204**, session cleared.

> Current user is read on the client via the `nuxt-auth-utils` session (`useUserSession`), so a
> dedicated `GET /me` is not required; the session is available during SSR.

---

## Collection (auth required — 401 without a session)

### `GET /api/collection`
The session user's caught Pokémon, newest first.
- **200** → `CollectionEntry[]` (scoped to the session user only — [AC-6.3](./01-requirements.md)).

### `POST /api/collection`
Catch a Pokémon.
**Body:** `{ "pokemonId": number }`.
- Server fetches display fields (name/sprite) via the cached PokéAPI util and upserts on
  `(userId, pokemonId)` → **idempotent** ([AC-5.3](./01-requirements.md)).
- **201** → `CollectionEntry`.
- **404** if `pokemonId` does not resolve to a real Pokémon.

### `DELETE /api/collection/:pokemonId`
Release a Pokémon.
- **204** on success (also for an entry that wasn't present — release is idempotent).
- Only ever affects the session user's own rows.

---

## Endpoint ↔ requirement map

| Endpoint | Requirement |
|---|---|
| `GET /api/pokemon` | US-1 browse, US-2 search |
| `GET /api/pokemon/:name` | US-3 explore (+ Grass shiny rule AC-3.4) |
| `POST /api/auth/register` · `login` · `logout` | US-4 auth |
| `POST /api/collection` | US-5 catch |
| `GET /api/collection` | US-6 view collection |
| `DELETE /api/collection/:pokemonId` | US-7 release |
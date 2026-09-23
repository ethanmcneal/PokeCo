# 03 — Data Model

## What we persist (and what we don't)

We persist **only what we own**: users and their caught Pokémon. Pokémon reference data (names,
heights, abilities, sprites) is **not** stored — it belongs to PokéAPI and is cached at the API
layer instead. Duplicating it would create a stale second copy for no benefit.

For each caught Pokémon we store a small **display snapshot** (`pokemonName`, `spriteUrl`) so the
collection page can render without an upstream fetch per entry, plus the `pokemonId` needed to
link back to the live detail page. This is a pragmatic middle ground: fast collection rendering,
authoritative data still fetched fresh on the detail page.

## Entities

### User
The identity that owns a collection.

| Field | Type | Notes |
|---|---|---|
| `id` | string (cuid) | Primary key |
| `email` | string | Unique, lowercased; the login handle |
| `passwordHash` | string | Hash only — never the plaintext (see [ADR 0003](./adr/0003-session-auth-strategy.md)) |
| `createdAt` | datetime | Defaulted server-side |

### CaughtPokemon
One row = one species caught by one user. This is the collection.

| Field | Type | Notes |
|---|---|---|
| `id` | string (cuid) | Primary key |
| `userId` | string (FK → User) | Owner; all queries scope by this |
| `pokemonId` | int | PokéAPI numeric id; links to the live detail |
| `pokemonName` | string | Display snapshot |
| `spriteUrl` | string | Display snapshot (default sprite) |
| `caughtAt` | datetime | Defaulted to now on create — satisfies "see when each was caught" |

**Uniqueness:** a composite unique constraint on `(userId, pokemonId)`. A user owns a given
species at most once, which makes catching **idempotent** ([AC-5.3](./01-requirements.md)) and makes
"is this caught?" a simple lookup. Rationale over allowing duplicates: the requirements describe a
*collection* and "when each Pokémon was caught" (singular), so one entry per species is the
faithful reading — and it's simpler.

## Relationships

```
User (1) ───────< (many) CaughtPokemon
        userId FK, ON DELETE CASCADE
```

- One user has many caught Pokémon.
- Deleting a user cascades to their collection (no orphan rows).
- There is intentionally **no** Pokémon table — `pokemonId` is a reference into PokéAPI, not a FK.

## Prisma schema (target)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String         @id @default(cuid())
  email        String         @unique
  passwordHash String
  createdAt    DateTime       @default(now())
  caught       CaughtPokemon[]
}

model CaughtPokemon {
  id          String   @id @default(cuid())
  userId      String
  pokemonId   Int
  pokemonName String
  spriteUrl   String
  caughtAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, pokemonId])
  @@index([userId])
}
```

## Access rules

- **Every** collection query is scoped by the session user's `id`. There is no code path that
  reads a collection without a `userId` filter — this is how "independent of other users"
  ([AC-6.3](./01-requirements.md)) is enforced, at the repository layer.
- The `repositories/` layer is the only code that imports the Prisma client.

## Migrations & seed

- Schema changes go through `prisma migrate` (committed migration files show intent/history).
- A small optional seed script can create a demo user so the app can be logged into immediately
  after setup; credentials, if seeded, are documented in the root README.

## Why SQLite

Zero-infra, file-based, clone-and-run — see [ADR 0002](./adr/0002-sqlite-prisma-persistence.md).
Because access goes through Prisma + the repository layer, moving to a server SQL database
(e.g. MySQL / SQL Server) is a provider/URL change, not an application rewrite.
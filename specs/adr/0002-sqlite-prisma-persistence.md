# ADR 0002 — SQLite + Prisma for persistence

- **Status:** Accepted
- **Date:** 2026-09-23

## Context

The per-user collection is the data the application owns and must persist: users and the Pokémon
they have caught, with a caught-at timestamp, kept independent per user (see
[03-data-model](../03-data-model.md)). We need a datastore and an access layer. Options
considered:

1. **SQLite + Prisma** — file-based database, type-safe client and migrations.
2. **A server SQL database + Prisma** (e.g. MySQL / SQL Server) — production-grade, via Docker Compose.
3. **In-memory / JSON file** — no database dependency.

## Decision

Use SQLite as the database and Prisma as the ORM / migration tool. All database access is confined
to the `repositories/` layer, so the rest of the application depends on domain methods rather than
Prisma directly.

## Rationale

- **Zero external infrastructure.** SQLite is a file; the project installs and runs with no
  database server to provision, which keeps setup to a single install-and-run.
- **Prisma gives type safety and migrations.** The schema is declarative, the client is typed
  (matching our end-to-end TypeScript approach), and committed migration files record how the
  schema evolved.
- **Right-sized durability.** The collection must survive restarts and stay per-user, which an
  in-memory or JSON store does not guarantee cleanly (concurrency, corruption, no query layer).
- **Low migration cost to a server database.** Because access goes through Prisma and the
  repository layer, moving to a server SQL database (e.g. MySQL / SQL Server) is a datasource
  provider and connection-string change, not an application rewrite.

## Consequences

- **Positive:** trivial setup, typed queries, real migrations, easy to seed and inspect, portable
  to a server database later.
- **Negative:** SQLite is single-writer and not suited to high-concurrency production write loads.
  That is acceptable for this application; the Prisma/repository boundary is the planned upgrade
  path if it ever isn't.
- **Rejected — server SQL database now:** the more production-realistic choice, but requires the environment to
  run a database server (Docker), adding setup friction without a benefit this scope needs.
  **Rejected — in-memory/JSON:** loses data on restart and provides no query/constraint layer for
  the per-user scoping and uniqueness the data model relies on.
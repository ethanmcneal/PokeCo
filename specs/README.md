# PokéCo — Specifications

This directory holds the design specs for the Pokémon Information Application. It is written
**spec-first**: the requirements and design are pinned down here before implementation, and the
code is expected to trace back to these documents.

## Approach

These specs are written spec-first: we decompose the requirements, fix the contracts (data model,
API, UX), and then implement against them. Each technical decision traces back to a requirement in
[01](./01-requirements.md) or to a recorded trade-off in `adr/`.

A guiding principle throughout: **meet the requirements well, without over-engineering.** Where we
chose the simpler option, that choice is recorded rather than left implicit.

## How to read these

Read in order. Each doc builds on the previous one.

| # | Spec | Answers |
|---|------|---------|
| 01 | [Requirements](./01-requirements.md) | What are we building and why? What does "done" mean? |
| 02 | [Architecture](./02-architecture.md) | What is the system shape, stack, and layering? |
| 03 | [Data Model](./03-data-model.md) | What do we persist, and how is it structured? |
| 04 | [API Contract](./04-api-contract.md) | What are the endpoints, DTOs, and error model? |
| 05 | [Frontend & UX](./05-frontend-ux.md) | What are the pages, components, and user flows? |
| 06 | [Testing & Quality](./06-testing-quality.md) | How do we prove it works and keep quality high? |
| 07 | [Security](./07-security.md) | What are the threats and the controls against them? |

The implementation plan derived from these specs lives in [tasks.md](./tasks.md) — phased, ordered
by dependency, and used to track progress across sessions.

### Architecture Decision Records (`adr/`)

Short, dated records of the significant choices and the alternatives rejected, so the reasoning
behind each is on record, not just the outcome.

- [0001 — Nuxt full-stack over a separate API service](./adr/0001-nuxt-fullstack-over-separate-api.md)
- [0002 — SQLite + Prisma for persistence](./adr/0002-sqlite-prisma-persistence.md)
- [0003 — Session auth over a managed identity provider](./adr/0003-session-auth-strategy.md)

## Stack at a glance

- **Framework:** Nuxt (Vue 3) full-stack — SSR frontend + Nitro server routes as the API
- **Language:** TypeScript, strict mode, front to back
- **Data source:** [PokéAPI](https://pokeapi.co/) — proxied and cached through our own API layer
- **UI:** Nuxt UI (Tailwind-based, accessible) themed with custom design tokens
- **Persistence:** SQLite via Prisma (the collection is the data we own)
- **Auth:** `nuxt-auth-utils` — email + password, sealed httpOnly cookie sessions
- **Testing:** Vitest (unit/integration) + Playwright (one end-to-end catch flow)
- **Tooling:** ESLint + Prettier, pnpm
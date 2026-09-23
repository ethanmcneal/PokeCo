# ADR 0001 — Nuxt full-stack over a separate API service

- **Status:** Accepted
- **Date:** 2026-09-23

## Context

The application needs somewhere for its API to live. The requirements call for a Pokémon reference
app built on Node.js with Vue/Nuxt preferred, backed by the public PokéAPI and a small per-user
collection. Three shapes were considered:

1. **Nuxt full-stack** — a Nuxt (Vue) frontend with Nitro server routes serving `/api/*`.
2. **Separate Fastify API** + Nuxt frontend in a monorepo.
3. **Separate NestJS API** + Nuxt frontend.

## Decision

Build a single Nuxt full-stack application. Nitro (Nuxt's Node server) hosts the API under
`/api/*`. The server is internally layered — handlers → services → repositories (see
[02-architecture](../02-architecture.md)) — so the API could later be lifted into a standalone
service by moving those layers rather than rewriting them.

## Rationale

- **Scope fit.** The app browses a public API and persists a small collection. A second service
  adds an extra process, cross-origin configuration, cross-repo type sharing, and a separate
  deployment — operational complexity the requirements do not justify.
- **Satisfies "Node.js for the API."** Nitro is a production Node server; `/api/*` is a real HTTP
  API, co-deployed with the UI rather than split into its own process.
- **Separation of concerns is preserved** through internal layering, so promoting the API to a
  standalone service later means relocating `services/` + `repositories/`, not a rewrite.
- **Shared types front to back** with no build step to keep two repositories in sync.
- **Fast to run** — a single install and dev command, with no inter-service wiring.

## Consequences

- **Positive:** less surface area, shared types, simple local run and deploy, one mental model.
- **Negative:** the API is not independently deployable or scalable as-is. If that became a
  requirement, the existing layer boundaries make extraction straightforward.
- **Rejected — Fastify:** cleaner physical separation but two processes and more wiring than this
  scope warrants. **Rejected — NestJS:** the most explicit structure, but its boilerplate is
  disproportionate to an app of this size.
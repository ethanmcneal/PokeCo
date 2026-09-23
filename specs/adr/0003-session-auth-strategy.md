# ADR 0003 — Session auth over a managed identity provider

- **Status:** Accepted
- **Date:** 2026-09-23

## Context

Collections must be per-user and independent of other users, which requires user identity: a way
to register, log in, and scope every collection query to the authenticated user. Options
considered:

1. **`nuxt-auth-utils`** — email + password with server-side, sealed httpOnly cookie sessions.
2. **A managed identity provider** (e.g. Azure AD B2C) — hosted user directory and login pages via
   an OAuth/OIDC redirect flow.
3. **Hand-rolled auth** — our own password hashing, session handling, and crypto.

## Decision

Use `nuxt-auth-utils` for email + password authentication with sealed, httpOnly cookie sessions.
We own the flow (register, login, logout, route protection) while the library provides password
hashing and session sealing. A small server helper reads the session and rejects unauthenticated
requests to collection routes with `401`.

## Rationale

- **Own the flow, not the crypto.** The library handles the parts that should never be
  reimplemented (password hashing, session sealing), while the application keeps control of the
  auth flow and route guards. This avoids both the risk of hand-rolled crypto and the loss of
  control that comes with a fully external provider.
- **No external infrastructure.** A managed provider would require a live external directory and
  configuration for the app to function, so it could not be cloned and run standalone. Cookie
  sessions with a local database keep the app self-contained.
- **Fits a server-rendered Nuxt app.** Sealed httpOnly cookies are read during SSR and are not
  exposed to client JavaScript, avoiding the token-in-`localStorage` XSS surface of a browser-held
  JWT.
- **Proportionate.** A hosted OIDC login is a redirect flow (PKCE, callback handling, token
  exchange and refresh) — more integration surface than this application's identity needs require.

## Consequences

- **Positive:** self-contained, runs anywhere, minimal integration surface, sessions suited to SSR,
  no third-party account needed to use the app.
- **Negative:** we do not get a managed provider's features (password-reset flows, MFA, account
  recovery, federated identity). These are out of scope here and are noted as production concerns.
- **Production path:** for a real deployment, identity would be delegated to a managed provider
  such as Azure AD B2C, offloading password policy, MFA, and recovery, with the session/token
  validated at the API edge. Security posture is detailed in [07-security](../07-security.md).
- **Rejected — managed identity provider:** strong for production identity, but its infrastructure
  dependency and redirect-flow integration are disproportionate for a self-contained reference app.
  **Rejected — hand-rolled auth:** reimplementing password hashing and session crypto is
  unnecessary risk when a maintained library covers exactly those parts.
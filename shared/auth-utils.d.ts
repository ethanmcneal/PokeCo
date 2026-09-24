// Augments nuxt-auth-utils' session types so `user` is strongly typed wherever
// the session is read/written — server (requireUser, handlers) and client
// (useUserSession). Lives in shared/ so both Nuxt TS projects (app + server)
// include it; Nuxt 4 uses separate project references, so a root-level .d.ts
// would only reach one of them.
declare module '#auth-utils' {
  interface User {
    id: string
    email: string
  }
}

export {}

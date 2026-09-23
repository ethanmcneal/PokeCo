// Augments nuxt-auth-utils' session types so `user` is strongly typed wherever
// the session is read/written (handlers, requireUser, useUserSession).
declare module '#auth-utils' {
  interface User {
    id: string
    email: string
  }
}

export {}

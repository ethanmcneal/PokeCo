// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint', 'nuxt-auth-utils'],

  // Strict TypeScript across the app (see specs/06-testing-quality.md).
  typescript: {
    strict: true,
    // Type-checking is run explicitly via `pnpm typecheck` (vue-tsc) rather
    // than on every dev build, to keep the dev loop fast.
    typeCheck: false,
  },

  // Formatting is owned by Prettier; ESLint handles correctness only.
  eslint: {
    config: {
      stylistic: false,
    },
  },

  // Server-side runtime config. Values are overridden by NUXT_* env vars at
  // runtime — see specs/02-architecture.md (Config) and .env.example.
  runtimeConfig: {
    // NUXT_POKE_API_BASE_URL
    pokeApiBaseUrl: 'https://pokeapi.co/api/v2',
    // nuxt-auth-utils session. The sealing password comes from
    // NUXT_SESSION_PASSWORD (see .env.example). httpOnly + Secure (prod) are the
    // module defaults; SameSite=Lax is set explicitly. See specs/07-security.md.
    session: {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      cookie: {
        sameSite: 'lax',
      },
    },
  },
})

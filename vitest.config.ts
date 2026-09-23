import { defineVitestConfig } from '@nuxt/test-utils/config'

// Unit/integration tests run in a Node environment by default (services,
// repositories, API handlers). Component tests can opt into the Nuxt
// environment per-file with `// @vitest-environment nuxt`.
// See specs/06-testing-quality.md.
export default defineVitestConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.{test,spec}.ts', 'server/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      include: ['server/**', 'shared/**'],
    },
  },
})

import { defineConfig, devices } from '@playwright/test'

// End-to-end config. The full user journeys are added in later phases; the
// cross-browser matrix (Chromium/Firefox/WebKit) below satisfies the
// "compliant with major browsers" goal (see specs/06-testing-quality.md).
// Browser binaries are installed on demand with `pnpm exec playwright install`.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The journey asserts on live PokéAPI-backed pages (a browse render fans out to
  // ~25 upstream calls on a cold cache), so allow more than the 5s default.
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    navigationTimeout: 30_000,
  },
  // Run E2E against the production build: it's faster and more stable than the
  // dev server (no on-demand route compilation), and closer to what ships. The
  // standalone Nitro server needs its session secret and an absolute DB path in
  // its environment (unlike `nuxt dev`/`preview`, it doesn't load `.env`).
  // Requires a migrated DB (`pnpm db:migrate`).
  webServer: {
    command: 'pnpm build && node .output/server/index.mjs',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NUXT_SESSION_PASSWORD:
        process.env.NUXT_SESSION_PASSWORD ?? 'e2e-session-password-at-least-32-characters',
      DATABASE_URL: `file:${process.cwd()}/prisma/dev.db`,
      // Auth endpoints are rate-limited (5 registers/min per IP); the E2E drives
      // many from one IP, so disable it for the test server only.
      E2E_DISABLE_RATE_LIMIT: 'true',
    },
  },
  // All three engines are configured. `pnpm test:e2e` runs Chromium + Firefox
  // (reliable on any machine); `pnpm test:e2e:all` adds WebKit, whose Playwright
  // build fails to launch on some setups (older macOS, restricted environments).
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})

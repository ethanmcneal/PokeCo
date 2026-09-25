import { test, expect } from '@playwright/test'

// The critical path from specs/06-testing-quality.md, run across all three
// browser engines (see playwright.config.ts). A unique email per run keeps the
// persistent dev DB from 409-ing on re-runs and stops the parallel browser
// projects from colliding with each other.
function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@pokeco.test`
}

test('register → browse → open a Pokémon → catch → see it in the collection', async ({ page }) => {
  await page.goto('/register')
  await page.locator('input[type="email"]').fill(uniqueEmail())
  await page.locator('input[type="password"]').fill('catchemall123')
  await page.getByRole('button', { name: 'Create account' }).click()

  // Registration logs the user in and lands them on the browse grid.
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Browse Pokémon' })).toBeVisible()

  // Open the first Pokémon's detail page. Take the name from the link's href, and
  // wait for the detail heading to actually render — the detail page `await`s its
  // fetch, so Nuxt keeps the browse grid mounted until the data resolves.
  const firstCard = page.locator('a[href^="/pokemon/"]').first()
  const href = (await firstCard.getAttribute('href')) ?? ''
  const name = href.split('/pokemon/')[1]!.split('?')[0]!
  await firstCard.click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()

  // Catch it — the button flips to the caught state optimistically. The button's
  // accessible name is "Catch <name>" / "Caught <name>" (labelled per Pokémon).
  // Wait for the POST to persist before navigating, so the reload below reads it
  // back from the server rather than racing the optimistic update.
  const persisted = page.waitForResponse(
    (r) => r.url().includes('/api/collection') && r.request().method() === 'POST' && r.ok(),
  )
  await page.getByRole('button', { name: `Catch ${name}` }).click()
  await expect(page.getByRole('button', { name: `Caught ${name}` })).toBeVisible()
  await persisted

  // It shows up in My Collection with a human-readable caught-at time.
  await page.goto('/collection')
  await expect(page.getByRole('heading', { name: 'My Collection' })).toBeVisible()
  await expect(page.getByText(name, { exact: false })).toBeVisible()
  // Just-caught renders "Caught now"; older entries render "Caught N … ago".
  // (No `^` anchor: Playwright doesn't trim leading whitespace for regex matches.)
  await expect(page.getByText(/Caught (now|.+ ago)/)).toBeVisible()
})

test('visiting /collection while logged out redirects to /login', async ({ page }) => {
  await page.goto('/collection')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

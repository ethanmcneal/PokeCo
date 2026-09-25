import { test, expect } from '@playwright/test'

// Smoke check that the app boots and renders the browse page.
test('home page renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'PokéCo' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Browse Pokémon' })).toBeVisible()
})

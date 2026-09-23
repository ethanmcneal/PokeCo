import { test, expect } from '@playwright/test'

// Smoke check that the app boots and renders. Real user journeys (register →
// browse → catch → collection) are added in later phases.
test('home page renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('PokéCo')
})

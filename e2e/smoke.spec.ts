import { expect, test } from '@playwright/test'

test('app opens', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Starway/i)
})

import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Foro/);
});

test('homepage displays header', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('h1');
  await expect(header).toContainText('Foro');
});

import { expect, test } from '@playwright/test';

test('home to catalog navigation works', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText(/TEXNO\s*MARKET/i).first()).toBeVisible();
  await page.getByRole('link', { name: /katalog/i }).first().click();

  await expect(page).toHaveURL(/\/menu$/);
  await expect(page.getByRole('heading', { name: /katalog/i })).toBeVisible();
});


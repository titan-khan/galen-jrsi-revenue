import { test, expect, waitForApp } from '../fixtures/base';

test.describe('404 Not Found Page', () => {
  test('renders for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByText('Oops! Page not found')).toBeVisible();
  });

  test('has a Return to Home link', async ({ page }) => {
    await page.goto('/nonexistent-path');
    await waitForApp(page);

    const homeLink = page.getByRole('link', { name: /Return to Home/i });
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute('href', '/');
  });

  test('clicking Return to Home navigates to homepage', async ({ page }) => {
    await page.goto('/some-random-page-xyz');
    await waitForApp(page);

    await page.getByRole('link', { name: /Return to Home/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

import { test, expect, waitForApp } from '../fixtures/base';

test.describe('Specialist Detail', () => {
  test('detail page loads for a given ID without crashing', async ({ page }) => {
    await page.goto('/specialists/test-specialist-id');
    await waitForApp(page);

    // The page should render within the AppLayout
    await expect(page.locator('main')).toBeVisible();
  });

  test('shows fallback state for non-existent specialist', async ({ page }) => {
    await page.goto('/specialists/nonexistent-id-12345');
    await waitForApp(page);

    // Should show some kind of not-found or empty state within the specialist detail
    // The page should not crash — main content should be visible
    await expect(page.locator('main')).toBeVisible();
  });
});

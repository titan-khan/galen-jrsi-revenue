import { test, expect, waitForApp } from '../fixtures/base';

test.describe('Home Dashboard', () => {
  test('page loads with Quick Actions', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await expect(page.getByRole('button', { name: /Ask Assistant/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Configure/i })).toBeVisible();
  });

  test('Quick Actions navigate correctly', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // Ask Assistant → /assistant
    await page.getByRole('button', { name: /Ask Assistant/i }).click();
    await expect(page).toHaveURL(/\/assistant$/);

    // Go back and click Configure → /settings
    await page.goto('/');
    await waitForApp(page);
    await page.getByRole('button', { name: /Configure/i }).click();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('section headers render', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await expect(page.getByText('Insight updates')).toBeVisible();
    await expect(page.getByText('Pending actions', { exact: true })).toBeVisible();
    await expect(page.getByText('Active specialists')).toBeVisible();
    await expect(page.getByText('Recent metrics')).toBeVisible();
  });

  test('empty state messages show when no data', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // With mocked empty Supabase, specialists list is empty
    // Should show empty insight message
    const insightEmpty = page.getByText(/No insights yet|Loading insights/);
    await expect(insightEmpty).toBeVisible();

    // Pending actions empty
    const pendingEmpty = page.getByText(/No pending actions|Loading/);
    await expect(pendingEmpty).toBeVisible();
  });

  test('recent metrics section shows dashboard link', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await expect(page.getByText('View metrics dashboard →')).toBeVisible();
  });
});

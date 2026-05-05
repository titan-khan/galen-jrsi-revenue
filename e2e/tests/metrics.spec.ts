import { test, expect, waitForApp } from '../fixtures/base';

test.describe('Metrics Dashboard', () => {
  test('page loads with title and description', async ({ page }) => {
    await page.goto('/metrics');
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: 'Your Metrics' })).toBeVisible();
    await expect(page.getByText(/Track your followed metrics/)).toBeVisible();
  });

  test('period selector row renders', async ({ page }) => {
    await page.goto('/metrics');
    await waitForApp(page);

    // PeriodSelectorRow should render period controls
    // Look for common period selector elements
    const periodSection = page.locator('.mb-5').nth(1); // second mb-5 div
    await expect(periodSection).toBeVisible();
  });

  test('three tabs render: Following, Browse, Relationships', async ({ page }) => {
    await page.goto('/metrics');
    await waitForApp(page);

    await expect(page.getByRole('tab', { name: /Following/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Browse/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Relationships/i })).toBeVisible();
  });

  test('Following tab is selected by default', async ({ page }) => {
    await page.goto('/metrics');
    await waitForApp(page);

    const followingTab = page.getByRole('tab', { name: /Following/i });
    await expect(followingTab).toHaveAttribute('aria-selected', 'true');
  });

  test('clicking Browse tab switches content', async ({ page }) => {
    await page.goto('/metrics');
    await waitForApp(page);

    await page.getByRole('tab', { name: /Browse/i }).click();

    const browseTab = page.getByRole('tab', { name: /Browse/i });
    await expect(browseTab).toHaveAttribute('aria-selected', 'true');
  });

  test('clicking Relationships tab switches content', async ({ page }) => {
    await page.goto('/metrics');
    await waitForApp(page);

    await page.getByRole('tab', { name: /Relationships/i }).click();

    const relTab = page.getByRole('tab', { name: /Relationships/i });
    await expect(relTab).toHaveAttribute('aria-selected', 'true');
  });

  test('metric definition page loads at /metrics/new', async ({ page }) => {
    await page.goto('/metrics/new');
    await waitForApp(page);

    // The page should load without crashing
    await expect(page.locator('main')).toBeVisible();
  });
});

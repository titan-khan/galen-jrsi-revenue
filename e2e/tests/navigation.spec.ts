import { test, expect, waitForApp } from '../fixtures/base';

// Sidebar navigation tests — skip on mobile viewport where sidebar is hidden
test.describe('Sidebar Navigation & Routing', () => {
  test('sidebar renders with all navigation items', async ({ page, browserName }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Sidebar hidden on mobile');
    await page.goto('/');
    await waitForApp(page);

    // Brand text
    await expect(page.locator('text=Galen').first()).toBeVisible();

    // Four main nav items
    await expect(page.locator('a[href="/"]').filter({ hasText: 'Home' })).toBeVisible();
    await expect(page.locator('a[href="/assistant"]').filter({ hasText: 'Assistant' })).toBeVisible();
    await expect(page.locator('a[href="/specialists"]').filter({ hasText: 'Specialists' })).toBeVisible();
    await expect(page.locator('a[href="/metrics"]').filter({ hasText: 'Metrics' })).toBeVisible();

    // Settings icon in footer
    await expect(page.locator('a[href="/settings"]')).toBeVisible();
  });

  test('clicking nav items routes to correct pages', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Sidebar hidden on mobile');
    await page.goto('/');
    await waitForApp(page);

    // Navigate to Assistant
    await page.locator('a[href="/assistant"]').filter({ hasText: 'Assistant' }).click();
    await expect(page).toHaveURL(/\/assistant$/);

    // Navigate to Specialists
    await page.locator('a[href="/specialists"]').filter({ hasText: 'Specialists' }).click();
    await expect(page).toHaveURL(/\/specialists$/);

    // Navigate to Metrics
    await page.locator('a[href="/metrics"]').filter({ hasText: 'Metrics' }).click();
    await expect(page).toHaveURL(/\/metrics$/);

    // Navigate back Home
    await page.locator('a[href="/"]').filter({ hasText: 'Home' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('sidebar highlights active route', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Sidebar hidden on mobile');
    await page.goto('/specialists');
    await waitForApp(page);

    // The active sidebar menu button has data-active="true" via asChild on the <a>
    const specialistsLink = page.locator('a[href="/specialists"]').filter({ hasText: 'Specialists' });
    await expect(specialistsLink).toHaveAttribute('data-active', 'true');
  });

  test('header renders search bar and bell icon', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // Search input
    await expect(page.locator('header input[placeholder="Search..."]')).toBeVisible();

    // Bell icon button
    await expect(page.locator('header button').filter({ has: page.locator('.lucide-bell') })).toBeVisible();
  });

  test('legacy redirect routes work', async ({ page }) => {
    // /ai-agents → /specialists
    await page.goto('/ai-agents');
    await waitForApp(page);
    await expect(page).toHaveURL(/\/specialists$/);

    // /ai-agents/new → /specialists/new
    await page.goto('/ai-agents/new');
    await waitForApp(page);
    await expect(page).toHaveURL(/\/specialists\/new$/);

    // /agent-insights → /specialists
    await page.goto('/agent-insights');
    await waitForApp(page);
    await expect(page).toHaveURL(/\/specialists$/);
  });
});

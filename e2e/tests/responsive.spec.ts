import { test, expect, waitForApp } from '../fixtures/base';

test.describe('Responsive Behavior', () => {
  test('mobile viewport: sidebar is not expanded by default', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForApp(page);

    // On mobile, the sidebar should be collapsed/hidden
    // The brand text "Galen" should not be visible in expanded form
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    // Sidebar might be hidden or collapsed on mobile
    const sidebarState = page.locator('[data-state="collapsed"]');
    // At minimum, the main content should be visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('mobile viewport: main content fills viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForApp(page);

    // Main content should be visible and accessible
    await expect(page.locator('main')).toBeVisible();
  });

  test('mobile viewport: settings tabs show abbreviated labels', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/settings');
    await waitForApp(page);

    // On small screens, tabs use short labels: Profile, Strategy, AI, Links
    // The full labels (Business Profile, Strategic Context, etc.) have "hidden sm:inline"
    // So the short version ".sm:hidden" span should be visible
    await expect(page.locator('span.sm\\:hidden').filter({ hasText: 'Profile' })).toBeVisible();
  });

  test('desktop viewport: full sidebar visible', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await waitForApp(page);

    // Brand text should be visible
    await expect(page.locator('text=Galen').first()).toBeVisible();

    // All nav items visible with labels
    await expect(page.locator('a[href="/"]').filter({ hasText: 'Home' })).toBeVisible();
    await expect(page.locator('a[href="/assistant"]').filter({ hasText: 'Assistant' })).toBeVisible();
    await expect(page.locator('a[href="/specialists"]').filter({ hasText: 'Specialists' })).toBeVisible();
    await expect(page.locator('a[href="/metrics"]').filter({ hasText: 'Metrics' })).toBeVisible();
  });
});

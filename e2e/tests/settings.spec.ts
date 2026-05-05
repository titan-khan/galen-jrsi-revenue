import { test, expect, waitForApp } from '../fixtures/base';

test.describe('Settings Page', () => {
  test('page loads with title', async ({ page }) => {
    await page.goto('/settings');
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: 'Company Settings' })).toBeVisible();
    await expect(page.getByText('Configure your business context')).toBeVisible();
  });

  test('four tabs render', async ({ page }) => {
    await page.goto('/settings');
    await waitForApp(page);

    // On desktop, tabs show full labels
    await expect(page.getByRole('tab', { name: /Business Profile|Profile/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Strategic Context|Strategy/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Metric Intelligence|AI/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Integrations|Links/i })).toBeVisible();
  });

  test('Business Profile tab is active by default', async ({ page }) => {
    await page.goto('/settings');
    await waitForApp(page);

    const profileTab = page.getByRole('tab', { name: /Business Profile|Profile/i });
    await expect(profileTab).toHaveAttribute('data-state', 'active');
  });

  test('clicking Strategic Context tab switches content', async ({ page }) => {
    await page.goto('/settings');
    await waitForApp(page);

    await page.getByRole('tab', { name: /Strategic Context|Strategy/i }).click();
    const strategyTab = page.getByRole('tab', { name: /Strategic Context|Strategy/i });
    await expect(strategyTab).toHaveAttribute('data-state', 'active');
  });

  test('clicking Integrations tab shows coming soon', async ({ page }) => {
    await page.goto('/settings');
    await waitForApp(page);

    await page.getByRole('tab', { name: /Integrations|Links/i }).click();

    await expect(page.getByText('Data Integrations')).toBeVisible();
    await expect(page.getByText('Integration settings coming soon')).toBeVisible();
  });

  test('tabs can be switched back and forth', async ({ page }) => {
    await page.goto('/settings');
    await waitForApp(page);

    // Go to Integrations
    await page.getByRole('tab', { name: /Integrations|Links/i }).click();
    await expect(page.getByText('Data Integrations')).toBeVisible();

    // Go back to Profile
    await page.getByRole('tab', { name: /Business Profile|Profile/i }).click();
    const profileTab = page.getByRole('tab', { name: /Business Profile|Profile/i });
    await expect(profileTab).toHaveAttribute('data-state', 'active');
  });
});

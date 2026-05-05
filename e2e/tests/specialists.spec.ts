import { test, expect, waitForApp } from '../fixtures/base';

test.describe('Specialists List', () => {
  test('page loads with title and description', async ({ page }) => {
    await page.goto('/specialists');
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: 'Specialists' })).toBeVisible();
    await expect(page.getByText('Your AI agents monitoring operations 24/7')).toBeVisible();
  });

  test('search input renders', async ({ page }) => {
    await page.goto('/specialists');
    await waitForApp(page);

    await expect(page.locator('input[placeholder="Search specialists..."]')).toBeVisible();
  });

  test('status filter pills render with All active by default', async ({ page }) => {
    await page.goto('/specialists');
    await waitForApp(page);

    const allPill = page.getByRole('button', { name: 'All' });
    const activePill = page.getByRole('button', { name: 'Active' });
    const pausedPill = page.getByRole('button', { name: 'Paused' });

    await expect(allPill).toBeVisible();
    await expect(activePill).toBeVisible();
    await expect(pausedPill).toBeVisible();

    // "All" should have the active styling (bg-background class)
    await expect(allPill).toHaveClass(/bg-background/);
  });

  test('status filter pills can be toggled', async ({ page }) => {
    await page.goto('/specialists');
    await waitForApp(page);

    const activePill = page.getByRole('button', { name: 'Active' });
    await activePill.click();

    // Active pill should now have the selected styling
    await expect(activePill).toHaveClass(/bg-background/);
  });

  test('New Specialist button navigates to wizard', async ({ page }) => {
    await page.goto('/specialists');
    await waitForApp(page);

    await page.getByRole('button', { name: /New Specialist/i }).click();
    await expect(page).toHaveURL(/\/specialists\/new$/);
  });

  test('empty state renders with message and CTA', async ({ page }) => {
    await page.goto('/specialists');
    await waitForApp(page);

    // With mocked empty Supabase, no specialists exist
    await expect(page.getByText('No specialists yet')).toBeVisible();
    await expect(page.getByText(/AI agents that continuously monitor/)).toBeVisible();

    const createBtn = page.getByRole('button', { name: /Create your first specialist/i });
    await expect(createBtn).toBeVisible();
  });

  test('Create your first specialist CTA navigates to wizard', async ({ page }) => {
    await page.goto('/specialists');
    await waitForApp(page);

    await page.getByRole('button', { name: /Create your first specialist/i }).click();
    await expect(page).toHaveURL(/\/specialists\/new$/);
  });

  test('search input accepts text', async ({ page }) => {
    await page.goto('/specialists');
    await waitForApp(page);

    const searchInput = page.locator('input[placeholder="Search specialists..."]');
    await searchInput.fill('revenue');
    await expect(searchInput).toHaveValue('revenue');
  });
});

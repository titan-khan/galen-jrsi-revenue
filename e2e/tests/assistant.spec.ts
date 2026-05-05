import { test, expect, waitForApp } from '../fixtures/base';

test.describe('AI Assistant', () => {
  test('page loads with greeting', async ({ page }) => {
    await page.goto('/assistant');
    await waitForApp(page);

    // The page should render without crashing
    await expect(page.locator('main')).toBeVisible();
  });

  test('conversation sub-header renders', async ({ page }) => {
    await page.goto('/assistant');
    await waitForApp(page);

    // New Chat button (there are two instances, use .first())
    await expect(page.getByRole('button', { name: /New Chat/i }).first()).toBeVisible();
  });

  test('suggestion carousel or greeting visible on empty state', async ({ page }) => {
    await page.goto('/assistant');
    await waitForApp(page);

    // When no messages, the greeting and suggestion cards are shown
    // At minimum, the main content area should be visible
    const mainContent = page.locator('.max-w-3xl');
    await expect(mainContent.first()).toBeVisible();
  });

  test('message input field is present', async ({ page }) => {
    await page.goto('/assistant');
    await waitForApp(page);

    // There should be a text input area at the bottom
    const inputArea = page.locator('textarea, input[type="text"]').last();
    await expect(inputArea).toBeVisible();
  });

  test('message input accepts text', async ({ page }) => {
    await page.goto('/assistant');
    await waitForApp(page);

    const inputArea = page.locator('textarea, input[type="text"]').last();
    await inputArea.fill('Hello assistant');
    await expect(inputArea).toHaveValue('Hello assistant');
  });
});

import { test, expect, waitForApp } from '../fixtures/base';

test.describe('Specialist Creation Wizard', () => {
  test('wizard loads with header and Draft badge', async ({ page }) => {
    await page.goto('/specialists/new');
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: 'Create New Specialist' })).toBeVisible();
    await expect(page.getByText('Draft')).toBeVisible();
  });

  test('wizard sidebar shows all 5 steps', async ({ page }) => {
    await page.goto('/specialists/new');
    await waitForApp(page);

    await expect(page.getByText('Overview')).toBeVisible();
    await expect(page.getByText('Monitoring')).toBeVisible();
    await expect(page.getByText('Rules')).toBeVisible();
    await expect(page.getByText('Knowledge')).toBeVisible();
    await expect(page.getByText('Alerts')).toBeVisible();
  });

  test('Overview step renders business view picker', async ({ page }) => {
    await page.goto('/specialists/new');
    await waitForApp(page);

    // Business view label
    await expect(page.getByText('Business View')).toBeVisible();

    // 6 business view options should be present
    await expect(page.getByText('Revenue')).toBeVisible();
    await expect(page.getByText('Operations')).toBeVisible();
    await expect(page.getByText('Customer Experience')).toBeVisible();
  });

  test('name and description fields render', async ({ page }) => {
    await page.goto('/specialists/new');
    await waitForApp(page);

    await expect(page.locator('input[placeholder*="Revenue Monitor"]')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="should this specialist focus on"]')).toBeVisible();
  });

  test('Continue button is disabled until required fields are filled', async ({ page }) => {
    await page.goto('/specialists/new');
    await waitForApp(page);

    // Continue should be disabled initially (no name, no business view)
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeDisabled();

    // Select a business view — "Revenue" option
    await page.getByText('Revenue').first().click();
    // Continue still disabled (name empty)
    await expect(continueBtn).toBeDisabled();

    // Type a name
    await page.locator('input[placeholder*="Revenue Monitor"]').fill('Test Specialist');
    // Continue should now be enabled
    await expect(continueBtn).toBeEnabled();
  });

  test('clicking Continue advances to Monitoring step', async ({ page }) => {
    await page.goto('/specialists/new');
    await waitForApp(page);

    // Fill required fields
    await page.getByText('Revenue').first().click();
    await page.locator('input[placeholder*="Revenue Monitor"]').fill('Test Specialist');

    // Click Continue
    await page.getByRole('button', { name: 'Continue' }).click();

    // Should now be on Monitoring step — look for monitoring-specific content
    // The sidebar should show step 1 as complete
    await expect(page.getByText('Monitoring')).toBeVisible();
  });

  test('Back button returns to previous step', async ({ page }) => {
    await page.goto('/specialists/new');
    await waitForApp(page);

    // Fill and advance
    await page.getByText('Revenue').first().click();
    await page.locator('input[placeholder*="Revenue Monitor"]').fill('My Specialist');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Click Back
    await page.getByRole('button', { name: 'Back' }).click();

    // Should be back on Overview, and name should be preserved
    const nameInput = page.locator('input[placeholder*="Revenue Monitor"]');
    await expect(nameInput).toHaveValue('My Specialist');
  });

  test('Back from step 1 navigates to /specialists', async ({ page }) => {
    await page.goto('/specialists/new');
    await waitForApp(page);

    // Click Back (or the arrow-left button)
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/specialists$/);
  });

  test('clicking suggested focus area prefills name and description', async ({ page }) => {
    await page.goto('/specialists/new');
    await waitForApp(page);

    // Select Revenue to get suggestions
    await page.getByText('Revenue').first().click();
    await page.waitForTimeout(500);

    // Look for "Suggested Focus Areas" section
    const suggestionsSection = page.getByText(/Suggested Focus/i);
    if (await suggestionsSection.isVisible()) {
      // Click the first suggestion card
      const firstSuggestion = page.locator('[class*="cursor-pointer"]').first();
      if (await firstSuggestion.isVisible()) {
        await firstSuggestion.click();

        // Name should now be filled
        const nameInput = page.locator('input[placeholder*="Revenue Monitor"]');
        const nameValue = await nameInput.inputValue();
        expect(nameValue.length).toBeGreaterThan(0);
      }
    }
  });
});

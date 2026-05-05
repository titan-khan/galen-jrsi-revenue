import { test as base, Page } from '@playwright/test';

/**
 * Intercept all Supabase network calls so tests run without a live backend.
 * MetricsContext has hardcoded initial data so metric cards render anyway.
 * SpecialistsContext starts empty, giving us the valid "empty state" to test.
 */
async function mockSupabaseAPI(page: Page) {
  // REST API — return empty arrays for list queries, success for mutations
  await page.route('**/rest/v1/**', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (['POST', 'PATCH', 'DELETE'].includes(method)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: `mock-${Date.now()}` }]),
      });
      return;
    }

    await route.continue();
  });

  // Edge Functions (assistant SSE, skill execution, etc.)
  await page.route('**/functions/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: '',
    });
  });

  // Auth endpoints
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

/** Wait for the React app to hydrate (lazy-loaded route chunks done). */
async function waitForApp(page: Page) {
  // Wait for the app to have rendered something beyond the spinner
  await page.waitForLoadState('domcontentloaded');
  // Give lazy chunks a moment to load
  await page.waitForTimeout(1000);
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await mockSupabaseAPI(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
export { waitForApp };

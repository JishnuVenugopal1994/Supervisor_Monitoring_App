/**
 * TC-ROLE — Role Access Control (4 tests)
 * Verifies that viewers cannot see or use mutation controls, and that the API
 * enforces the SUPERVISOR role guard with HTTP 403.
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth/viewer.json' });

test.describe('TC-ROLE — Role Access Control', () => {
  test('TC-ROLE-01: Viewer has no mutation controls on Work Orders', async ({ page }) => {
    await page.goto('/work-orders');
    await expect(page).toHaveURL(/work-orders/);

    await expect(page.locator('button:has-text("+ New Work Order")')).toHaveCount(0);
    // No status transition buttons (text starts with "→")
    await expect(page.locator('button').filter({ hasText: /^→/ })).toHaveCount(0);
    await expect(page.locator('button:has-text("Edit")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Delete")')).toHaveCount(0);
  });

  test('TC-ROLE-02: Viewer has no mutation controls on Resources', async ({ page }) => {
    await page.goto('/resources');

    // Operators tab (default)
    await expect(page.locator('button:has-text("+ Add Operator")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Mark Absent")')).toHaveCount(0);
    await expect(page.locator('[data-testid="operator-row"] button:has-text("Delete")')).toHaveCount(0);

    // Machines tab
    await page.click('button:has-text("Machines")');
    await expect(page.locator('button:has-text("+ Add Machine")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Set Maintenance")')).toHaveCount(0);
    await expect(page.locator('[data-testid="machine-row"] button:has-text("Delete")')).toHaveCount(0);
  });

  test('TC-ROLE-03: Viewer has no mutation controls on Materials', async ({ page }) => {
    await page.goto('/materials');

    await expect(page.locator('button:has-text("+ Add Material")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Adjust")')).toHaveCount(0);
    await expect(page.locator('[data-testid="material-row"] button:has-text("Delete")')).toHaveCount(0);
  });

  test('TC-ROLE-04: API returns 403 for viewer mutation attempt', async ({ page }) => {
    await page.goto('/work-orders');
    await expect(page).toHaveURL(/work-orders/);

    // Intercept the app's own GET /api/work-orders request to capture the Authorization header
    // (the access token is in-memory; this is the only way to read it without exposing it to window)
    let capturedAuthHeader = '';
    await page.route('**/api/work-orders', async (route) => {
      if (route.request().method() === 'GET') {
        capturedAuthHeader = route.request().headers()['authorization'] ?? '';
      }
      await route.continue();
    });
    // Wait for the page to load (which triggers the GET request we're intercepting)
    await expect(page.locator('[data-testid="work-order-row"]').first()).toBeVisible({ timeout: 10000 });
    await page.unroute('**/api/work-orders');

    expect(capturedAuthHeader).toMatch(/^Bearer /);

    // Use Playwright's request API to POST with the viewer's token
    const response = await page.request.post('http://localhost:4000/api/work-orders', {
      headers: {
        Authorization: capturedAuthHeader,
        'Content-Type': 'application/json',
      },
      data: {
        orderNumber: 'WO-ROLE-HACK',
        title: 'Unauthorized attempt',
        scheduledStart: new Date().toISOString(),
        scheduledEnd: new Date(Date.now() + 3_600_000).toISOString(),
        targetQty: 1,
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json() as { error: string };
    expect(body.error).toContain('Insufficient permissions');
  });
});

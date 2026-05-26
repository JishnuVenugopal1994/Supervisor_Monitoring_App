/**
 * TC-NAV — Navigation (3 tests)
 */
import { test, expect } from '@playwright/test';

test.describe('TC-NAV-01: All nav links route to correct pages', () => {
  test.use({ storageState: 'auth/supervisor.json' });

  test('TC-NAV-01', async ({ page }) => {
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });

    await page.click('a:has-text("Work Orders")');
    await expect(page).toHaveURL(/work-orders/);

    await page.click('a:has-text("Resources")');
    await expect(page).toHaveURL(/resources/);

    await page.click('a:has-text("Materials")');
    await expect(page).toHaveURL(/materials/);

    await page.click('a:has-text("Board")');
    await expect(page).toHaveURL(/board/);
  });
});

test.describe('TC-NAV-02: Header shows username and role badge', () => {
  test('TC-NAV-02: supervisor badge', async ({ page }) => {
    test.use({ storageState: 'auth/supervisor.json' });
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });
    const header = page.locator('header');
    await expect(header).toContainText('supervisor');
    await expect(header).toContainText('SUPERVISOR');
  });

  test('TC-NAV-02: viewer badge', async ({ page }) => {
    test.use({ storageState: 'auth/viewer.json' });
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });
    const header = page.locator('header');
    await expect(header).toContainText('viewer');
    await expect(header).toContainText('VIEWER');
  });
});

test.describe('TC-NAV-03: Unauthenticated access redirects to /login', () => {
  // No storageState — fresh unauthenticated context
  const protectedRoutes = ['/board', '/work-orders', '/resources', '/materials'];

  for (const route of protectedRoutes) {
    test(`TC-NAV-03: ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL('**/login', { timeout: 8000 });
      expect(page.url()).toContain('/login');
    });
  }
});

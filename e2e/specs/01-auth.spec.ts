/**
 * TC-AUTH — Authentication (9 tests)
 * These tests manage their own auth state — no storageState fixture.
 * NOTE: Wrong-password errors are shown as inline <p> elements, NOT toasts.
 *       The LoginPage uses setError() not toast.error() for credential failures.
 */
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('TC-AUTH — Authentication', () => {
  test('TC-AUTH-01: Valid supervisor login', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('supervisor', 'password123');
    await page.waitForURL('**/board');
    expect(page.url()).toContain('/board');
  });

  test('TC-AUTH-02: Valid viewer login', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('viewer', 'viewer123');
    await page.waitForURL('**/board');
    expect(page.url()).toContain('/board');
  });

  test('TC-AUTH-03: Wrong password shows inline error (not a toast)', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('supervisor', 'wrongpassword');
    // Error rendered as <p className="text-sm text-red-600"> in LoginPage
    await lp.expectInlineError('Invalid credentials');
    expect(page.url()).toContain('/login');
  });

  test('TC-AUTH-04: Empty fields — client validation', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await page.click('button[type="submit"]');
    await lp.expectInlineError('Username and password are required');
    expect(page.url()).toContain('/login');
  });

  test('TC-AUTH-05: Sign In button shows loading state during request', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    // Delay the login response so we can observe the loading state
    await page.route('**/api/auth/login', async (route) => {
      await new Promise<void>((r) => setTimeout(r, 600));
      await route.continue();
    });
    await page.fill('input[name="username"]', 'supervisor');
    await page.fill('input[name="password"]', 'password123');
    const btn = page.locator('button[type="submit"]');
    await btn.click();
    await expect(btn).toContainText('Signing in…');
    await expect(btn).toBeDisabled();
    await page.unroute('**/api/auth/login');
    await page.waitForURL('**/board');
  });

  test('TC-AUTH-06: Logout clears session and redirects to /login', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('supervisor', 'password123');
    await page.waitForURL('**/board');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');
    // After logout the refreshToken cookie is cleared by the server.
    // Navigating to /board should redirect back to /login.
    await page.goto('/board');
    await page.waitForURL('**/login', { timeout: 8000 });
    expect(page.url()).toContain('/login');
  });

  test('TC-AUTH-07: Already authenticated — /login redirects to /board', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('supervisor', 'password123');
    await page.waitForURL('**/board');
    // Navigate to /login while already authenticated
    await page.goto('/login');
    // LoginPage: if (isAuthenticated) { navigate('/board') }
    await page.waitForURL('**/board');
    expect(page.url()).toContain('/board');
  });

  test('TC-AUTH-08: Page refresh restores session via refreshToken cookie', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('supervisor', 'password123');
    await page.waitForURL('**/board');
    // Full page reload resets all in-memory JS (Zustand store) but keeps cookies.
    // ProtectedRoute's useEffect calls /api/auth/refresh using the httpOnly cookie.
    await page.reload();
    await expect(
      page.locator('[data-testid="work-order-column"]').first(),
    ).toBeVisible({ timeout: 12000 });
    expect(page.url()).toContain('/board');
  });

  test('TC-AUTH-09: Expired refresh token forces redirect to /login', async ({ page, context }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('supervisor', 'password123');
    await page.waitForURL('**/board');
    // Clear the httpOnly refreshToken cookie via Playwright's Node-side API
    // (cannot clear httpOnly cookies with document.cookie in the browser)
    await context.clearCookies({ name: 'refreshToken' });
    // Reload so React remounts fresh — session restore attempt will fail (no cookie)
    await page.reload();
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});

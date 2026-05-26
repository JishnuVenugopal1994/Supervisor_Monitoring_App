/**
 * TC-BOARD-VIW — Board Page for Viewer role (3 tests)
 * Verifies that the viewer sees the board in read-only mode:
 * no ResourcePanel, no delete buttons, no drag handles.
 */
import { test, expect } from '@playwright/test';
import { getSupervisorToken, createAllocationViaAPI, getWorkOrders } from '../helpers/api';

test.use({ storageState: 'auth/viewer.json' });

test.describe('TC-BOARD-VIW — Board (Viewer)', () => {
  // Ensure at least one allocation exists before these tests run
  test.beforeAll(async () => {
    const token = await getSupervisorToken();
    const wos = await getWorkOrders(token);
    const wo = wos.find((w) => w.status !== 'COMPLETED');
    if (wo) {
      await createAllocationViaAPI(
        {
          workOrderId: wo.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        },
        token,
      ).catch(() => {/* allocation may already exist */});
    }
  });

  test('TC-BOARD-VIW-01: ResourcePanel is absent for viewer', async ({ page }) => {
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });

    // No "Assign to work order" dropdown
    await expect(
      page.locator('select').filter({ has: page.locator('option:has-text("Select…")') }),
    ).toHaveCount(0);
    // No resource rows in panel
    await expect(page.locator('[data-testid="resource-operator"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="resource-machine"]')).toHaveCount(0);
  });

  test('TC-BOARD-VIW-02: Delete button absent on AllocationCards for viewer', async ({ page }) => {
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });

    // The remove button must not appear in the DOM for viewer
    await expect(page.locator('button[title="Remove allocation"]')).toHaveCount(0);
  });

  test('TC-BOARD-VIW-03: Allocation cards have no drag handles (cursor-grab) for viewer', async ({ page }) => {
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });

    // Idle badges are still visible (read-only state is correct)
    await expect(page.locator('[data-testid="idle-operators"]')).toBeVisible();
    await expect(page.locator('[data-testid="idle-machines"]')).toBeVisible();

    // Allocation cards should not have cursor-grab class (drag listeners not attached for viewer)
    const cards = page.locator('[data-testid="allocation-card"]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const hasCursorGrab = await cards.nth(i).evaluate(
        (el) => el.classList.contains('cursor-grab'),
      );
      expect(hasCursorGrab).toBe(false);
    }
  });
});

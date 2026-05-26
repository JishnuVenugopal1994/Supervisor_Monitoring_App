/**
 * TC-WO — Work Orders page (14 tests)
 */
import { test, expect } from '@playwright/test';
import { WorkOrdersPage } from '../pages/WorkOrdersPage';
import { reseedDB } from '../helpers/seed';

test.use({ storageState: 'auth/supervisor.json' });
test.beforeAll(() => reseedDB());

const FUTURE_START = '2026-12-01T08:00';
const FUTURE_END = '2026-12-01T16:00';

test.describe('TC-WO — Work Orders', () => {
  test('TC-WO-01: Create work order — valid', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();
    await wp.create({
      orderNumber: 'WO-TEST-001',
      title: 'E2E Test Order',
      scheduledStart: FUTURE_START,
      scheduledEnd: FUTURE_END,
      targetQty: '10',
    });
    await wp.expectToast('Work order created');
    await expect(wp.rowFor('WO-TEST-001')).toBeVisible();
    await expect(wp.rowFor('WO-TEST-001').locator('text=PENDING')).toBeVisible();
  });

  test('TC-WO-02: Create work order — empty fields validation', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();
    await page.click('button:has-text("+ New Work Order")');
    await page.click('button[type="submit"]:has-text("Save")');
    await wp.expectInlineError('All fields are required');
    // No new row added (count unchanged from seed)
    const rows = await page.locator('[data-testid="work-order-row"]').count();
    expect(rows).toBe(5);
  });

  test('TC-WO-03: Create work order — end before start validation', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();
    await page.click('button:has-text("+ New Work Order")');
    await page.fill('input[name="orderNumber"]', 'WO-BAD');
    await page.fill('input[name="title"]', 'Bad Dates');
    await page.fill('input[name="scheduledStart"]', '2026-12-01T10:00');
    await page.fill('input[name="scheduledEnd"]', '2026-12-01T08:00'); // before start
    await page.fill('input[name="targetQty"]', '5');
    await page.click('button[type="submit"]:has-text("Save")');
    await wp.expectInlineError('End must be after start');
  });

  test('TC-WO-04: Edit work order title', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();
    await wp.edit('WO-001', { title: 'Updated Title E2E' });
    await wp.expectToast('Work order updated');
    await expect(wp.rowFor('WO-001').locator('text=Updated Title E2E')).toBeVisible();
  });

  test('TC-WO-05: Status transition PENDING → IN_PROGRESS (no success toast by design)', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();
    await wp.transition('WO-001', 'IN_PROGRESS');
    // No toast.success — only the badge update is feedback
    const row = wp.rowFor('WO-001');
    await expect(row.locator('text=IN PROGRESS')).toBeVisible({ timeout: 6000 });
    // Both COMPLETED and ON HOLD transition buttons now visible
    await expect(row.locator('button:has-text("→ COMPLETED")')).toBeVisible();
    await expect(row.locator('button:has-text("→ ON HOLD")')).toBeVisible();
  });

  test('TC-WO-06: Status transitions IN_PROGRESS → ON_HOLD → IN_PROGRESS', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();
    // WO-002 is seeded as IN_PROGRESS
    await wp.transition('WO-002', 'ON_HOLD');
    await expect(wp.rowFor('WO-002').locator('text=ON HOLD')).toBeVisible({ timeout: 6000 });
    await expect(wp.rowFor('WO-002').locator('button:has-text("→ IN PROGRESS")')).toBeVisible();

    await wp.transition('WO-002', 'IN_PROGRESS');
    await expect(wp.rowFor('WO-002').locator('text=IN PROGRESS')).toBeVisible({ timeout: 6000 });
    await expect(wp.rowFor('WO-002').locator('button:has-text("→ COMPLETED")')).toBeVisible();
  });

  test('TC-WO-07: Status transition IN_PROGRESS → COMPLETED (terminal, no success toast)', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();
    // WO-002 is IN_PROGRESS (seeded)
    await wp.transition('WO-002', 'COMPLETED');
    const row = wp.rowFor('WO-002');
    await expect(row.locator('text=COMPLETED')).toBeVisible({ timeout: 6000 });
    // No more transition buttons
    await expect(row.locator('button').filter({ hasText: /^→/ })).toHaveCount(0);
    // Delete button appears
    await expect(row.locator('button:has-text("Delete")')).toBeVisible();
  });

  test('TC-WO-08: Delete only available when COMPLETED', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();
    // Verify non-COMPLETED rows have no Delete button
    for (const orderNumber of ['WO-001', 'WO-003']) {
      await expect(
        wp.rowFor(orderNumber).locator('button:has-text("Delete")'),
      ).toHaveCount(0);
    }
    // Transition WO-002 to COMPLETED so we can delete it
    await wp.transition('WO-002', 'COMPLETED');
    await expect(wp.rowFor('WO-002').locator('button:has-text("Delete")')).toBeVisible();
    await wp.deleteWO('WO-002');
    await wp.expectToast('Work order deleted');
    await expect(wp.rowFor('WO-002')).toHaveCount(0);
  });

  test('TC-WO-09: No status transition buttons present on the Board page', async ({ page }) => {
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });
    await expect(page.locator('button').filter({ hasText: /^→/ })).toHaveCount(0);
  });

  test('TC-WO-10: COMPLETED orders absent from board columns', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();
    await wp.transition('WO-002', 'COMPLETED');
    await expect(wp.rowFor('WO-002').locator('text=COMPLETED')).toBeVisible({ timeout: 6000 });

    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });
    // WO-002 column must not exist
    await expect(page.locator('[data-testid="work-order-column"]', { hasText: 'WO-002' })).toHaveCount(0);
    // Remaining 4 non-COMPLETED columns still there
    await expect(page.locator('[data-testid="work-order-column"]')).toHaveCount(4);
  });

  test('TC-WO-11: Cancel New Work Order form closes without saving', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();
    const rowsBefore = await page.locator('[data-testid="work-order-row"]').count();

    await page.click('button:has-text("+ New Work Order")');
    await page.fill('input[name="orderNumber"]', 'WO-CANCEL');
    await page.click('button[type="button"]:has-text("Cancel")');

    await expect(page.locator('[data-testid="work-order-row"]')).toHaveCount(rowsBefore);
    await expect(wp.rowFor('WO-CANCEL')).toHaveCount(0);
  });

  test('TC-WO-12: Cancel Edit form preserves original data', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();

    await wp.rowFor('WO-001').locator('button:has-text("Edit")').click();
    await page.locator('input[name="title"]').fill('MODIFIED TITLE');
    await page.click('button[type="button"]:has-text("Cancel")');

    await expect(wp.rowFor('WO-001').locator('text=Assemble Drive Unit A')).toBeVisible();
    await expect(page.locator('text=MODIFIED TITLE')).toHaveCount(0);
  });

  test('TC-WO-13: targetQty = 0 passes client but is rejected by API Zod validation', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();
    await page.click('button:has-text("+ New Work Order")');
    await page.fill('input[name="orderNumber"]', 'WO-ZERO-QTY');
    await page.fill('input[name="title"]', 'Zero Qty');
    await page.fill('input[name="scheduledStart"]', FUTURE_START);
    await page.fill('input[name="scheduledEnd"]', FUTURE_END);
    await page.fill('input[name="targetQty"]', '0');
    await page.click('button[type="submit"]:has-text("Save")');
    // Client allows 0 (falsy check passes for the number 0 via parseInt)
    // API returns 400 (Zod positive() rejects 0) → error toast shown
    await expect(page.locator('div[role="status"]')).toBeVisible({ timeout: 6000 });
    await expect(wp.rowFor('WO-ZERO-QTY')).toHaveCount(0);
  });

  test('TC-WO-14: Duplicate orderNumber returns error toast (known: API returns 500 not 409)', async ({ page }) => {
    const wp = new WorkOrdersPage(page);
    await wp.goto();
    // WO-001 already exists in seed
    await wp.create({
      orderNumber: 'WO-001',
      title: 'Duplicate',
      scheduledStart: FUTURE_START,
      scheduledEnd: FUTURE_END,
      targetQty: '1',
    });
    // Prisma P2002 unique constraint — errorHandler currently returns 500
    await expect(page.locator('div[role="status"]')).toBeVisible({ timeout: 6000 });
    // Confirm only one WO-001 row exists
    await expect(wp.rowFor('WO-001')).toHaveCount(1);
  });
});

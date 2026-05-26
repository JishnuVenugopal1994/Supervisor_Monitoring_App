/**
 * TC-RT — Real-time sync via Socket.IO (3 tests)
 * Each test opens two browser contexts: a supervisor context that acts,
 * and a second context that observes — without reloading the page.
 *
 * IMPORTANT: wait for both contexts to finish loading before the supervisor acts,
 * otherwise the observing context may miss the Socket.IO event.
 */
import { test, expect, chromium } from '@playwright/test';
import { reseedDB } from '../helpers/seed';
import path from 'path';

test.beforeAll(() => reseedDB());

const SUP_STATE = path.resolve(__dirname, '..', 'auth', 'supervisor.json');
const VWR_STATE = path.resolve(__dirname, '..', 'auth', 'viewer.json');

test.describe('TC-RT — Real-time Sync', () => {
  test('TC-RT-01: Allocation created by supervisor appears on viewer board without reload', async () => {
    const browser = await chromium.launch({ channel: 'chrome' });
    const supCtx = await browser.newContext({ storageState: SUP_STATE });
    const vwrCtx = await browser.newContext({ storageState: VWR_STATE });
    const supPage = await supCtx.newPage();
    const vwrPage = await vwrCtx.newPage();

    try {
      await supPage.goto('http://localhost:5173/board');
      await vwrPage.goto('http://localhost:5173/board');

      // Wait for BOTH boards to be fully loaded before acting
      await expect(supPage.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });
      await expect(vwrPage.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });

      // Supervisor assigns Alice to WO-001
      const woSelect = supPage.locator('select').filter({
        has: supPage.locator('option:has-text("Select…")'),
      });
      await woSelect.selectOption({ label: 'WO-001' });
      await supPage.locator('[data-testid="resource-operator"]', { hasText: 'Alice Nguyen' }).click();
      await expect(
        supPage.locator('div[role="status"]').filter({ hasText: 'Resource assigned' }),
      ).toBeVisible({ timeout: 6000 });

      // Viewer sees the card without reloading
      await expect(
        vwrPage.locator('[data-testid="allocation-card"]', { hasText: 'Alice Nguyen' }),
      ).toBeVisible({ timeout: 8000 });
    } finally {
      await supCtx.close();
      await vwrCtx.close();
      await browser.close();
    }
  });

  test('TC-RT-02: Work order status change reflects on board in real-time', async () => {
    const browser = await chromium.launch({ channel: 'chrome' });
    const ctx1 = await browser.newContext({ storageState: SUP_STATE });
    const ctx2 = await browser.newContext({ storageState: SUP_STATE });
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    try {
      // page1 will change status on /work-orders; page2 watches /board
      await page2.goto('http://localhost:5173/board');
      await expect(page2.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });

      // page1: transition WO-003 to IN_PROGRESS
      await page1.goto('http://localhost:5173/work-orders');
      await expect(page1.locator('[data-testid="work-order-row"]').first()).toBeVisible({ timeout: 12000 });
      await page1.locator('[data-testid="work-order-row"]', { hasText: 'WO-003' })
        .locator('button:has-text("→ IN PROGRESS")')
        .click();

      // page2 board: WO-003 column header badge updates without reload
      const wo003Column = page2.locator('[data-testid="work-order-column"]', { hasText: 'WO-003' });
      await expect(wo003Column.locator('text=IN PROGRESS')).toBeVisible({ timeout: 8000 });
    } finally {
      await ctx1.close();
      await ctx2.close();
      await browser.close();
    }
  });

  test('TC-RT-03: Resource status change reflects in ResourcePanel in real-time', async () => {
    const browser = await chromium.launch({ channel: 'chrome' });
    const ctx1 = await browser.newContext({ storageState: SUP_STATE });
    const ctx2 = await browser.newContext({ storageState: SUP_STATE });
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    try {
      // page2 watches the board's ResourcePanel
      await page2.goto('http://localhost:5173/board');
      await expect(page2.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });

      // page1: mark Alice as ABSENT
      await page1.goto('http://localhost:5173/resources');
      await expect(page1.locator('[data-testid="operator-row"]').first()).toBeVisible({ timeout: 12000 });
      await page1.locator('[data-testid="operator-row"]', { hasText: 'Alice Nguyen' })
        .locator('button:has-text("Mark Absent")')
        .click();
      await expect(
        page1.locator('div[role="status"]').filter({ hasText: 'Operator marked absent' }),
      ).toBeVisible({ timeout: 6000 });

      // page2 board: Alice's row in ResourcePanel has opacity-60 (ABSENT styling) without reload
      const aliceRow = page2.locator('[data-testid="resource-operator"]', { hasText: 'Alice Nguyen' });
      await expect(aliceRow).toHaveClass(/opacity-60/, { timeout: 8000 });
    } finally {
      await ctx1.close();
      await ctx2.close();
      await browser.close();
    }
  });
});

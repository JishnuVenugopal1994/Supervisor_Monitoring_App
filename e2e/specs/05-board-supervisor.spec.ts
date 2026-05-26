/**
 * TC-BOARD-SUP — Board Page for Supervisor role (17 tests)
 * Each test is self-contained: if it needs an existing allocation it creates one.
 * Tests 13 & 14 (conflict tests) clear allocations via API in beforeEach instead of
 * a full reseedDB() — faster (~200 ms vs ~3 s) and sufficient for conflict isolation.
 */
import { test, expect } from '@playwright/test';
import { BoardPage } from '../pages/BoardPage';
import { reseedDB } from '../helpers/seed';
import {
  getSupervisorToken,
  getWorkOrders,
  createAllocationViaAPI,
  completeAllWorkOrders,
  deleteAllAllocations,
} from '../helpers/api';

test.use({ storageState: 'auth/supervisor.json' });

test.beforeAll(() => reseedDB());

// Helper: assign Alice Nguyen to WO-001 via the board UI, return when card is visible
async function assignAliceToWO001(board: BoardPage) {
  await board.goto();
  await board.selectWorkOrder('WO-001');
  await board.assignOperator('Alice Nguyen');
  await board.expectToast('Resource assigned');
  await expect(board.allocationCard('Alice Nguyen')).toBeVisible();
}

test.describe('TC-BOARD-SUP — Board (Supervisor)', () => {
  test('TC-BOARD-SUP-01: Initial board state loads without errors', async ({ page }) => {
    const board = new BoardPage(page);
    await board.goto();

    // 5 non-COMPLETED work order columns (all seed WOs are non-COMPLETED)
    await expect(page.locator('[data-testid="work-order-column"]')).toHaveCount(5);
    // ResourcePanel is visible (supervisor only)
    await expect(
      page.locator('select').filter({ has: page.locator('option:has-text("Select…")') }),
    ).toBeVisible();
    // Idle badges are visible
    await expect(board.idleOperators()).toBeVisible();
    await expect(board.idleMachines()).toBeVisible();
    // No ErrorBoundary crash
    await expect(page.locator('text=Something went wrong')).toHaveCount(0);
  });

  test('TC-BOARD-SUP-02: Only non-COMPLETED orders shown as columns', async ({ page }) => {
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });
    // With seed data, all 5 WOs are non-COMPLETED
    const count = await page.locator('[data-testid="work-order-column"]').count();
    expect(count).toBe(5);
  });

  test('TC-BOARD-SUP-03: Assign available operator to work order', async ({ page }) => {
    const board = new BoardPage(page);
    await board.goto();

    const idleText = await board.idleOperators().textContent();
    const initialIdle = parseInt(idleText!.split(': ')[1], 10);

    await board.selectWorkOrder('WO-001');
    await board.assignOperator('Alice Nguyen');

    await board.expectToast('Resource assigned');
    await expect(board.allocationCard('Alice Nguyen')).toBeVisible();
    // Idle count decreased by 1
    await expect(board.idleOperators()).toContainText(`Idle Operators: ${initialIdle - 1}`);
  });

  test('TC-BOARD-SUP-04: Assigned operator becomes non-clickable in ResourcePanel', async ({ page }) => {
    const board = new BoardPage(page);
    // Set up: assign Alice
    await assignAliceToWO001(board);

    // Alice's row should now have cursor-not-allowed (status = ASSIGNED)
    const aliceRow = page.locator('[data-testid="resource-operator"]', { hasText: 'Alice Nguyen' });
    const hasNotAllowed = await aliceRow.evaluate(
      (el) => el.classList.contains('cursor-not-allowed'),
    );
    expect(hasNotAllowed).toBe(true);

    // Clicking again should not create a second card
    const cardsBefore = await page.locator('[data-testid="allocation-card"]', { hasText: 'Alice Nguyen' }).count();
    await aliceRow.click();
    // Wait for any network response rather than burning a fixed 500 ms
    await expect(page.locator('[data-testid="allocation-card"]', { hasText: 'Alice Nguyen' })).toHaveCount(cardsBefore);
    const cardsAfter = await page.locator('[data-testid="allocation-card"]', { hasText: 'Alice Nguyen' }).count();
    expect(cardsAfter).toBe(cardsBefore);
  });

  test('TC-BOARD-SUP-05: Assign available machine to work order', async ({ page }) => {
    const board = new BoardPage(page);
    await board.goto();

    const idleText = await board.idleMachines().textContent();
    const initialIdle = parseInt(idleText!.split(': ')[1], 10);

    await board.selectWorkOrder('WO-003');
    await board.assignMachine('Welding Robot Arm 1');

    await board.expectToast('Resource assigned');
    await expect(board.allocationCard('Welding Robot Arm 1')).toBeVisible();
    await expect(board.idleMachines()).toContainText(`Idle Machines: ${initialIdle - 1}`);
  });

  test('TC-BOARD-SUP-06: MAINTENANCE machine is non-clickable in ResourcePanel', async ({ page }) => {
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });

    // CNC Mill Alpha (MCH-002) is seeded as MAINTENANCE
    const cncRow = page.locator('[data-testid="resource-machine"]', { hasText: 'CNC Mill Alpha' });
    const hasNotAllowed = await cncRow.evaluate((el) => el.classList.contains('cursor-not-allowed'));
    expect(hasNotAllowed).toBe(true);

    // Clicking should not create any card
    const cardsBefore = await page.locator('[data-testid="allocation-card"]').count();
    await cncRow.click();
    // Poll instead of burning a fixed 500 ms
    await expect(page.locator('[data-testid="allocation-card"]')).toHaveCount(cardsBefore);
    const cardsAfter = await page.locator('[data-testid="allocation-card"]').count();
    expect(cardsAfter).toBe(cardsBefore);
  });

  test('TC-BOARD-SUP-07: Filter operators by skill', async ({ page }) => {
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });

    const skillSelect = page.locator('select').filter({
      has: page.locator('option:has-text("All skills")'),
    });

    // Filter by "welding" — Alice Nguyen (welding,assembly) and David Osei (welding) have this skill
    await skillSelect.selectOption('welding');
    await expect(page.locator('[data-testid="resource-operator"]', { hasText: 'Alice Nguyen' })).toBeVisible();
    await expect(page.locator('[data-testid="resource-operator"]', { hasText: 'David Osei' })).toBeVisible();
    await expect(page.locator('[data-testid="resource-operator"]', { hasText: 'Bob Carter' })).toHaveCount(0);
    await expect(page.locator('[data-testid="resource-operator"]', { hasText: 'Carmen Silva' })).toHaveCount(0);

    // Reset to All skills
    await skillSelect.selectOption('');
    await expect(page.locator('[data-testid="resource-operator"]', { hasText: 'Bob Carter' })).toBeVisible();
    await expect(page.locator('[data-testid="resource-operator"]')).toHaveCount(6);
  });

  test('TC-BOARD-SUP-08: Move allocation to different column via drag', async ({ page }) => {
    const board = new BoardPage(page);
    // Set up: create Alice's card in WO-001
    await assignAliceToWO001(board);

    // Verify card is currently in WO-001 column
    const wo001Column = board.workOrderColumn('WO-001');
    await expect(wo001Column.locator('[data-testid="allocation-card"]', { hasText: 'Alice Nguyen' })).toBeVisible();

    // Drag to WO-003 column
    await board.dragCardTo('Alice Nguyen', 'WO-003');

    await board.expectToast('Allocation moved');
    // Card should now be in WO-003
    const wo003Column = board.workOrderColumn('WO-003');
    await expect(wo003Column.locator('[data-testid="allocation-card"]', { hasText: 'Alice Nguyen' })).toBeVisible({ timeout: 8000 });
    // And not in WO-001
    await expect(wo001Column.locator('[data-testid="allocation-card"]', { hasText: 'Alice Nguyen' })).toHaveCount(0);
  });

  test('TC-BOARD-SUP-09: Delete allocation', async ({ page }) => {
    const board = new BoardPage(page);
    await assignAliceToWO001(board);

    const idleText = await board.idleOperators().textContent();
    const idleBefore = parseInt(idleText!.split(': ')[1], 10);

    await board.deleteAllocation('Alice Nguyen');

    await board.expectToast('Allocation removed');
    await expect(board.allocationCard('Alice Nguyen')).toHaveCount(0);
    // Idle count restored
    await expect(board.idleOperators()).toContainText(`Idle Operators: ${idleBefore + 1}`);
  });

  test('TC-BOARD-SUP-10: Unnamed allocation displayed when no operator/machine', async ({ page }) => {
    // Create allocation via API with no operator/machine
    const token = await getSupervisorToken();
    const wos = await getWorkOrders(token);
    const wo001 = wos.find((w) => w.orderNumber === 'WO-001')!;
    await createAllocationViaAPI(
      {
        workOrderId: wo001.id,
        startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      },
      token,
    );

    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });

    await expect(page.locator('.text-gray-400.italic', { hasText: 'Unnamed allocation' })).toBeVisible();
  });

  test('TC-BOARD-SUP-11: Edit time — end before start shows validation toast', async ({ page }) => {
    const board = new BoardPage(page);
    await assignAliceToWO001(board);

    await board.openTimeEdit('Alice Nguyen');

    // Set end before start
    const now = new Date();
    const start = new Date(now.getTime() + 2 * 3_600_000);
    const end = new Date(now.getTime() + 1 * 3_600_000); // 1h before start
    const fmt = (d: Date) => d.toISOString().slice(0, 16);

    const card = board.allocationCard('Alice Nguyen');
    await card.locator('input[type="datetime-local"]').nth(0).fill(fmt(start));
    await card.locator('input[type="datetime-local"]').nth(1).fill(fmt(end));
    await card.locator('button:has-text("Save")').click();

    await board.expectToast('End time must be after start time');
    // Inputs remain visible (edit mode stays open)
    await expect(card.locator('input[type="datetime-local"]').first()).toBeVisible();
  });

  test('TC-BOARD-SUP-12: Edit time — valid range saves and closes', async ({ page }) => {
    const board = new BoardPage(page);
    await assignAliceToWO001(board);

    await board.openTimeEdit('Alice Nguyen');

    const now = new Date();
    const start = new Date(now.getTime() + 1 * 3_600_000);
    const end = new Date(now.getTime() + 6 * 3_600_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 16);

    await board.saveTimeEdit('Alice Nguyen', fmt(start), fmt(end));

    // Inputs should close (edit mode off)
    const card = board.allocationCard('Alice Nguyen');
    await expect(card.locator('input[type="datetime-local"]')).toHaveCount(0);
    // Time display is still visible
    await expect(card.locator('[title="Click to edit times"]')).toBeVisible();
  });

  test.describe('TC-BOARD-SUP-13 & 14: Conflict detection (clear allocations per test)', () => {
    test.beforeEach(async () => {
      // Delete all allocations via API — faster than a full reseedDB() (~200 ms vs ~3 s).
      // The service restores operator/machine statuses automatically on delete.
      const token = await getSupervisorToken();
      await deleteAllAllocations(token);
    });

    test('TC-BOARD-SUP-13: Operator double-booking rejected (OPERATOR_CONFLICT)', async ({ page }) => {
      // WO-001 (now+1h→now+5h) and WO-002 (now-2h→now+3h) overlap — use Alice
      const board = new BoardPage(page);
      await board.goto();

      // First assignment: Alice → WO-001
      await board.selectWorkOrder('WO-001');
      await board.assignOperator('Alice Nguyen');
      await board.expectToast('Resource assigned');
      await expect(board.allocationCard('Alice Nguyen')).toBeVisible();

      // Second assignment attempt: Alice → WO-002 (overlapping time)
      await board.selectWorkOrder('WO-002');
      await board.assignOperator('Alice Nguyen');

      // Expect conflict error
      await expect(
        page.locator('div[role="status"]').filter({ hasText: 'OPERATOR_CONFLICT' }),
      ).toBeVisible({ timeout: 6000 });
      // No card in WO-002 for Alice
      await expect(
        board.workOrderColumn('WO-002').locator('[data-testid="allocation-card"]', { hasText: 'Alice Nguyen' }),
      ).toHaveCount(0);
    });

    test('TC-BOARD-SUP-14: Machine double-booking rejected (MACHINE_CONFLICT)', async ({ page }) => {
      const board = new BoardPage(page);
      await board.goto();

      // First: Welding Robot Arm 1 → WO-001
      await board.selectWorkOrder('WO-001');
      await board.assignMachine('Welding Robot Arm 1');
      await board.expectToast('Resource assigned');

      // Second attempt: same machine → WO-002 (overlapping time)
      await board.selectWorkOrder('WO-002');
      await board.assignMachine('Welding Robot Arm 1');

      await expect(
        page.locator('div[role="status"]').filter({ hasText: 'MACHINE_CONFLICT' }),
      ).toBeVisible({ timeout: 6000 });
      await expect(
        board.workOrderColumn('WO-002').locator('[data-testid="allocation-card"]', { hasText: 'Welding Robot Arm 1' }),
      ).toHaveCount(0);
    });
  });

  test('TC-BOARD-SUP-15: Assign with no work order selected does nothing', async ({ page }) => {
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });

    // Dropdown still shows "Select…" (value = "")
    const woSelect = page.locator('select').filter({ has: page.locator('option:has-text("Select…")') });
    const selectedValue = await woSelect.inputValue();
    expect(selectedValue).toBe('');

    const cardsBefore = await page.locator('[data-testid="allocation-card"]').count();
    // Click an available operator without selecting a WO first
    await page.locator('[data-testid="resource-operator"]', { hasText: 'Alice Nguyen' }).click();
    // Poll instead of burning a fixed 500 ms
    await expect(page.locator('[data-testid="allocation-card"]')).toHaveCount(cardsBefore);

    const cardsAfter = await page.locator('[data-testid="allocation-card"]').count();
    expect(cardsAfter).toBe(cardsBefore);
    // No toast either
    await expect(page.locator('div[role="status"]')).toHaveCount(0);
  });

  test('TC-BOARD-SUP-16: Empty board shows "No active work orders." message', async ({ page }) => {
    // Complete all work orders via API (too slow/fragile to do via UI)
    const token = await getSupervisorToken();
    await completeAllWorkOrders(token);

    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toHaveCount(0, { timeout: 12000 }).catch(() => {});
    await expect(page.locator('text=No active work orders.')).toBeVisible({ timeout: 12000 });
    await expect(page.locator('[data-testid="work-order-column"]')).toHaveCount(0);
  });

  test('TC-BOARD-SUP-17: Time edit Cancel closes inputs without saving', async ({ page }) => {
    const board = new BoardPage(page);
    await assignAliceToWO001(board);

    // Read original time display text
    const card = board.allocationCard('Alice Nguyen');
    const originalTime = await card.locator('[title="Click to edit times"]').textContent();

    await board.openTimeEdit('Alice Nguyen');

    // Change the values but cancel
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 16);
    await card.locator('input[type="datetime-local"]').nth(0).fill(fmt(new Date(now.getTime() + 99 * 3_600_000)));
    await card.locator('input[type="datetime-local"]').nth(1).fill(fmt(new Date(now.getTime() + 100 * 3_600_000)));

    await board.cancelTimeEdit('Alice Nguyen');

    // Inputs gone
    await expect(card.locator('input[type="datetime-local"]')).toHaveCount(0);
    // Time display reverted to original
    await expect(card.locator('[title="Click to edit times"]')).toHaveText(originalTime!);
  });
});

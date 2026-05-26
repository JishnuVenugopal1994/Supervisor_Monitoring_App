/**
 * TC-RES — Resources page (12 tests)
 */
import { test, expect } from '@playwright/test';
import { ResourcesPage } from '../pages/ResourcesPage';
import { reseedDB } from '../helpers/seed';

test.use({ storageState: 'auth/supervisor.json' });
test.beforeAll(() => reseedDB());

test.describe('TC-RES — Resources', () => {
  test('TC-RES-01: Tab navigation Operators ↔ Machines', async ({ page }) => {
    const rp = new ResourcesPage(page);
    await rp.goto();

    // Default tab is Operators — shows "Employee ID" column header
    await expect(page.locator('th:has-text("Employee ID")')).toBeVisible();

    // Switch to Machines
    await rp.switchToMachines();
    await expect(page.locator('th:has-text("Code")')).toBeVisible();
    await expect(page.locator('th:has-text("Employee ID")')).toHaveCount(0);

    // Switch back
    await rp.switchToOperators();
    await expect(page.locator('th:has-text("Employee ID")')).toBeVisible();
  });

  test('TC-RES-02: Add operator — valid', async ({ page }) => {
    const rp = new ResourcesPage(page);
    await rp.goto();
    await rp.addOperator({ employeeId: 'EMP-E2E', name: 'E2E Operator', skills: 'welding,assembly' });
    await rp.expectToast('Operator added');
    await expect(rp.operatorRowFor('E2E Operator')).toBeVisible();
    await expect(rp.operatorRowFor('E2E Operator').locator('text=AVAILABLE')).toBeVisible();
  });

  test('TC-RES-03: Add operator — empty required fields validation', async ({ page }) => {
    const rp = new ResourcesPage(page);
    await rp.goto();
    await page.click('button:has-text("+ Add Operator")');
    await page.click('button[type="submit"]:has-text("Save")');
    await rp.expectInlineError('Employee ID and name are required');
    // No new row
    await expect(page.locator('[data-testid="operator-row"]')).toHaveCount(6);
  });

  test('TC-RES-04: Mark operator as ABSENT', async ({ page }) => {
    const rp = new ResourcesPage(page);
    await rp.goto();

    await rp.markAbsent('Alice Nguyen');
    await rp.expectToast('Operator marked absent');

    const row = rp.operatorRowFor('Alice Nguyen');
    await expect(row.locator('text=ABSENT')).toBeVisible();
    // Mark Absent button should disappear
    await expect(row.locator('button:has-text("Mark Absent")')).toHaveCount(0);

    // On the board, Alice's row should have reduced opacity
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });
    const aliceRow = page.locator('[data-testid="resource-operator"]', { hasText: 'Alice Nguyen' });
    const hasOpacity = await aliceRow.evaluate((el) => el.classList.contains('opacity-60'));
    expect(hasOpacity).toBe(true);
  });

  test('TC-RES-05: Delete operator', async ({ page }) => {
    const rp = new ResourcesPage(page);
    await rp.goto();
    const countBefore = await page.locator('[data-testid="operator-row"]').count();
    await rp.deleteOperator('Frank Müller');
    await rp.expectToast('Operator removed');
    await expect(rp.operatorRowFor('Frank Müller')).toHaveCount(0);
    await expect(page.locator('[data-testid="operator-row"]')).toHaveCount(countBefore - 1);
  });

  test('TC-RES-06: Add machine — valid', async ({ page }) => {
    const rp = new ResourcesPage(page);
    await rp.goto();
    await rp.switchToMachines();
    await rp.addMachine({ machineCode: 'MCH-E2E', name: 'E2E Machine', type: 'Assembly' });
    await rp.expectToast('Machine added');
    await expect(rp.machineRowFor('E2E Machine')).toBeVisible();
    await expect(rp.machineRowFor('E2E Machine').locator('text=AVAILABLE')).toBeVisible();
  });

  test('TC-RES-07: Add machine — empty fields validation', async ({ page }) => {
    const rp = new ResourcesPage(page);
    await rp.goto();
    await rp.switchToMachines();
    await page.click('button:has-text("+ Add Machine")');
    await page.click('button[type="submit"]:has-text("Save")');
    await rp.expectInlineError('All fields are required');
  });

  test('TC-RES-08: Set machine to MAINTENANCE', async ({ page }) => {
    const rp = new ResourcesPage(page);
    await rp.goto();
    await rp.switchToMachines();

    // MCH-003 Paint Booth 1 is AVAILABLE in seed
    await rp.setMaintenance('Paint Booth 1');
    await rp.expectToast('Machine set to maintenance');

    const row = rp.machineRowFor('Paint Booth 1');
    await expect(row.locator('text=MAINTENANCE')).toBeVisible();
    await expect(row.locator('button:has-text("Set Maintenance")')).toHaveCount(0);

    // On the board, Paint Booth 1 should have cursor-not-allowed
    await page.goto('/board');
    await expect(page.locator('[data-testid="work-order-column"]').first()).toBeVisible({ timeout: 12000 });
    const machineRow = page.locator('[data-testid="resource-machine"]', { hasText: 'Paint Booth 1' });
    const hasNotAllowed = await machineRow.evaluate((el) => el.classList.contains('cursor-not-allowed'));
    expect(hasNotAllowed).toBe(true);
  });

  test('TC-RES-09: Delete machine', async ({ page }) => {
    const rp = new ResourcesPage(page);
    await rp.goto();
    await rp.switchToMachines();
    const countBefore = await page.locator('[data-testid="machine-row"]').count();
    await rp.deleteMachine('Conveyor Pack 1');
    await rp.expectToast('Machine removed');
    await expect(rp.machineRowFor('Conveyor Pack 1')).toHaveCount(0);
    await expect(page.locator('[data-testid="machine-row"]')).toHaveCount(countBefore - 1);
  });

  test('TC-RES-10: Already-ABSENT operator has no Mark Absent button', async ({ page }) => {
    const rp = new ResourcesPage(page);
    await rp.goto();
    // David Osei (EMP-004) is seeded as ABSENT
    const row = rp.operatorRowFor('David Osei');
    await expect(row.locator('text=ABSENT')).toBeVisible();
    await expect(row.locator('button:has-text("Mark Absent")')).toHaveCount(0);
  });

  test('TC-RES-11: Cancel Add Operator form closes without saving', async ({ page }) => {
    const rp = new ResourcesPage(page);
    await rp.goto();
    const countBefore = await page.locator('[data-testid="operator-row"]').count();
    await page.click('button:has-text("+ Add Operator")');
    await page.fill('input[name="employeeId"]', 'EMP-CANCEL');
    await page.click('button[type="button"]:has-text("Cancel")');
    await expect(rp.operatorRowFor('EMP-CANCEL')).toHaveCount(0);
    await expect(page.locator('[data-testid="operator-row"]')).toHaveCount(countBefore);
  });

  test('TC-RES-12: Cancel Add Machine form closes without saving', async ({ page }) => {
    const rp = new ResourcesPage(page);
    await rp.goto();
    await rp.switchToMachines();
    const countBefore = await page.locator('[data-testid="machine-row"]').count();
    await page.click('button:has-text("+ Add Machine")');
    await page.fill('input[name="machineCode"]', 'MCH-CANCEL');
    await page.click('button[type="button"]:has-text("Cancel")');
    await expect(rp.machineRowFor('MCH-CANCEL')).toHaveCount(0);
    await expect(page.locator('[data-testid="machine-row"]')).toHaveCount(countBefore);
  });
});

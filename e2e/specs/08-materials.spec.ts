/**
 * TC-MAT — Materials page (7 tests)
 */
import { test, expect } from '@playwright/test';
import { MaterialsPage } from '../pages/MaterialsPage';
import { reseedDB } from '../helpers/seed';

test.use({ storageState: 'auth/supervisor.json' });
test.beforeAll(() => reseedDB());

// Use a seed material SKU we know exists — check seed.ts for a real SKU.
// The seed creates materials; we'll use the first one by picking any visible row.
const SEED_SKU_SELECTOR = '[data-testid="material-row"]:first-child';

test.describe('TC-MAT — Materials', () => {
  test('TC-MAT-01: Add material — valid', async ({ page }) => {
    const mp = new MaterialsPage(page);
    await mp.goto();
    await mp.addMaterial({ sku: 'MAT-E2E', name: 'E2E Material', unitOfMeasure: 'pcs', quantityOnHand: '50' });
    await mp.expectToast('Material added');
    await expect(mp.rowFor('MAT-E2E')).toBeVisible();
    await expect(mp.rowFor('MAT-E2E').locator('text=50')).toBeVisible();
  });

  test('TC-MAT-02: Add material — empty fields validation', async ({ page }) => {
    const mp = new MaterialsPage(page);
    await mp.goto();
    await page.click('button:has-text("+ Add Material")');
    await page.click('button:has-text("Save")');
    await mp.expectInlineError('All fields required');
  });

  test('TC-MAT-03: Adjust quantity — valid', async ({ page }) => {
    const mp = new MaterialsPage(page);
    await mp.goto();
    // First, add a material so we have a known SKU to adjust
    await mp.addMaterial({ sku: 'MAT-ADJ', name: 'Adjustable', unitOfMeasure: 'kg', quantityOnHand: '10' });
    await mp.expectToast('Material added');
    await mp.adjust('MAT-ADJ', '200');
    await mp.expectToast('Stock updated');
    await expect(mp.rowFor('MAT-ADJ').locator('text=200')).toBeVisible();
  });

  test('TC-MAT-04: Adjust quantity — negative value rejected', async ({ page }) => {
    const mp = new MaterialsPage(page);
    await mp.goto();
    await mp.addMaterial({ sku: 'MAT-NEG', name: 'Neg Test', unitOfMeasure: 'pcs', quantityOnHand: '10' });
    await mp.expectToast('Material added');

    const row = mp.rowFor('MAT-NEG');
    await row.locator('button:has-text("Adjust")').click();
    const input = row.locator('input[type="number"]');
    await input.clear();
    await input.fill('-5');
    await row.locator('button:has-text("Save")').click();

    await mp.expectToast('Invalid quantity');
    // Quantity unchanged
    await expect(row.locator('text=10')).toBeVisible();
  });

  test('TC-MAT-05: Adjust quantity — Cancel discards change', async ({ page }) => {
    const mp = new MaterialsPage(page);
    await mp.goto();
    await mp.addMaterial({ sku: 'MAT-CAN', name: 'Cancel Test', unitOfMeasure: 'pcs', quantityOnHand: '15' });
    await mp.expectToast('Material added');

    const row = mp.rowFor('MAT-CAN');
    await row.locator('button:has-text("Adjust")').click();
    await row.locator('input[type="number"]').fill('999');
    await mp.cancelAdjust('MAT-CAN');

    // Input disappeared
    await expect(row.locator('input[type="number"]')).toHaveCount(0);
    // Quantity unchanged
    await expect(row.locator('text=15')).toBeVisible();
    // No API call was made (no toast)
    await expect(page.locator('div[role="status"]')).toHaveCount(0);
  });

  test('TC-MAT-06: Low stock (qty ≤ 0) shows red text', async ({ page }) => {
    const mp = new MaterialsPage(page);
    await mp.goto();
    await mp.addMaterial({ sku: 'MAT-LOW', name: 'Low Stock', unitOfMeasure: 'pcs', quantityOnHand: '5' });
    await mp.expectToast('Material added');

    // Adjust to 0
    await mp.adjust('MAT-LOW', '0');
    await mp.expectToast('Stock updated');
    const qtyCell = mp.rowFor('MAT-LOW').locator('td').nth(3);
    const hasRed = await qtyCell.locator('span').evaluate(
      (el) => el.classList.contains('text-red-600'),
    );
    expect(hasRed).toBe(true);

    // Adjust to 1 — red should be gone
    await mp.adjust('MAT-LOW', '1');
    await mp.expectToast('Stock updated');
    const hasRedAfter = await qtyCell.locator('span').evaluate(
      (el) => el.classList.contains('text-red-600'),
    );
    expect(hasRedAfter).toBe(false);
  });

  test('TC-MAT-07: Cancel Add Material form closes without saving', async ({ page }) => {
    const mp = new MaterialsPage(page);
    await mp.goto();
    const countBefore = await page.locator('[data-testid="material-row"]').count();
    await page.click('button:has-text("+ Add Material")');
    await page.fill('input[name="sku"]', 'MAT-CANCEL');
    await page.click('button:has-text("Cancel")');
    await expect(mp.rowFor('MAT-CANCEL')).toHaveCount(0);
    await expect(page.locator('[data-testid="material-row"]')).toHaveCount(countBefore);
  });
});

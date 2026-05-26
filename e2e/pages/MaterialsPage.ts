import { Page, expect, Locator } from '@playwright/test';

export class MaterialsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/materials');
    await expect(this.page).toHaveURL(/materials/);
  }

  rowFor(sku: string): Locator {
    return this.page.locator('[data-testid="material-row"]', { hasText: sku });
  }

  async addMaterial(data: {
    sku: string;
    name: string;
    unitOfMeasure: string;
    quantityOnHand: string;
  }) {
    await this.page.click('button:has-text("+ Add Material")');
    await this.page.fill('input[name="sku"]', data.sku);
    await this.page.fill('input[name="name"]', data.name);
    await this.page.fill('input[name="unitOfMeasure"]', data.unitOfMeasure);
    await this.page.fill('input[name="quantityOnHand"]', data.quantityOnHand);
    await this.page.click('button:has-text("Save")');
  }

  async adjust(sku: string, qty: string) {
    const row = this.rowFor(sku);
    await row.locator('button:has-text("Adjust")').click();
    const input = row.locator('input[type="number"]');
    await input.clear();
    await input.fill(qty);
    await row.locator('button:has-text("Save")').click();
  }

  async cancelAdjust(sku: string) {
    await this.rowFor(sku).locator('button:has-text("Cancel")').click();
  }

  async deleteMaterial(sku: string) {
    await this.rowFor(sku).locator('button:has-text("Delete")').click();
  }

  async expectInlineError(text: string) {
    await expect(this.page.locator('p.text-red-600')).toContainText(text);
  }

  async expectToast(text: string) {
    await expect(
      this.page.locator('div[role="status"]').filter({ hasText: text }),
    ).toBeVisible({ timeout: 6000 });
  }
}

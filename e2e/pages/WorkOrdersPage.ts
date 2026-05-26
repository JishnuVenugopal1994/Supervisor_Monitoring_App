import { Page, expect, Locator } from '@playwright/test';

export class WorkOrdersPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/work-orders');
    await expect(this.page).toHaveURL(/work-orders/);
  }

  rowFor(orderNumber: string): Locator {
    return this.page.locator('[data-testid="work-order-row"]', {
      hasText: orderNumber,
    });
  }

  async create(data: {
    orderNumber: string;
    title: string;
    scheduledStart: string;
    scheduledEnd: string;
    targetQty: string;
  }) {
    await this.page.click('button:has-text("+ New Work Order")');
    await this.page.fill('input[name="orderNumber"]', data.orderNumber);
    await this.page.fill('input[name="title"]', data.title);
    await this.page.fill('input[name="scheduledStart"]', data.scheduledStart);
    await this.page.fill('input[name="scheduledEnd"]', data.scheduledEnd);
    await this.page.fill('input[name="targetQty"]', data.targetQty);
    await this.page.click('button[type="submit"]:has-text("Save")');
  }

  async edit(orderNumber: string, fields: { title?: string }) {
    await this.rowFor(orderNumber).locator('button:has-text("Edit")').click();
    if (fields.title !== undefined) {
      await this.page.locator('input[name="title"]').fill(fields.title);
    }
    await this.page.click('button[type="submit"]:has-text("Save")');
  }

  /**
   * Click a status transition button. toStatus uses the internal enum value,
   * e.g. 'IN_PROGRESS'. The button text shows underscores replaced with spaces.
   */
  async transition(orderNumber: string, toStatus: string) {
    const buttonText = `→ ${toStatus.replace(/_/g, ' ')}`;
    await this.rowFor(orderNumber).locator(`button:has-text("${buttonText}")`).click();
  }

  async deleteWO(orderNumber: string) {
    await this.rowFor(orderNumber).locator('button:has-text("Delete")').click();
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

import { Page, expect, Locator } from '@playwright/test';

export class BoardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/board');
    // Wait for the session restore + board data load before any interaction
    await expect(
      this.page.locator('[data-testid="work-order-column"]').first(),
    ).toBeVisible({ timeout: 12000 });
  }

  /** Select a work order in the ResourcePanel assignment dropdown. */
  async selectWorkOrder(orderNumber: string) {
    const woSelect = this.page
      .locator('select')
      .filter({ has: this.page.locator('option:has-text("Select…")') });
    await woSelect.selectOption({ label: orderNumber });
  }

  async assignOperator(name: string) {
    await this.page
      .locator('[data-testid="resource-operator"]', { hasText: name })
      .click();
  }

  async assignMachine(name: string) {
    await this.page
      .locator('[data-testid="resource-machine"]', { hasText: name })
      .click();
  }

  allocationCard(hasText: string): Locator {
    return this.page.locator('[data-testid="allocation-card"]', { hasText });
  }

  workOrderColumn(orderNumber: string): Locator {
    return this.page.locator('[data-testid="work-order-column"]', {
      hasText: orderNumber,
    });
  }

  async deleteAllocation(hasText: string) {
    const card = this.allocationCard(hasText);
    await card.locator('button[title="Remove allocation"]').click();
  }

  /** Drag an allocation card (identified by text) into a target column. */
  async dragCardTo(cardText: string, targetOrderNumber: string) {
    const card = this.allocationCard(cardText);
    const target = this.workOrderColumn(targetOrderNumber);

    const cardBox = await card.boundingBox();
    const targetBox = await target.boundingBox();
    if (!cardBox || !targetBox) throw new Error('Could not get bounding boxes for drag');

    const startX = cardBox.x + cardBox.width / 2;
    const startY = cardBox.y + cardBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;

    // Use page.mouse for reliable dnd-kit pointer-sensor activation
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // Move slightly first to satisfy activationConstraint: { distance: 5 }
    await this.page.mouse.move(startX + 8, startY + 2, { steps: 3 });
    await this.page.mouse.move(endX, endY, { steps: 15 });
    await this.page.mouse.up();
  }

  /** Click the time-edit toggle on an allocation card. */
  async openTimeEdit(cardText: string) {
    await this.allocationCard(cardText)
      .locator('[title="Click to edit times"]')
      .click();
  }

  /** Fill start+end in the open time-edit inputs and click Save. */
  async saveTimeEdit(cardText: string, start: string, end: string) {
    const card = this.allocationCard(cardText);
    const inputs = card.locator('input[type="datetime-local"]');
    await inputs.nth(0).fill(start);
    await inputs.nth(1).fill(end);
    await card.locator('button:has-text("Save")').click();
  }

  async cancelTimeEdit(cardText: string) {
    await this.allocationCard(cardText)
      .locator('button:has-text("Cancel")')
      .click();
  }

  idleOperators(): Locator {
    return this.page.locator('[data-testid="idle-operators"]');
  }

  idleMachines(): Locator {
    return this.page.locator('[data-testid="idle-machines"]');
  }

  async expectToast(text: string) {
    await expect(
      this.page.locator('div[role="status"]').filter({ hasText: text }),
    ).toBeVisible({ timeout: 6000 });
  }
}

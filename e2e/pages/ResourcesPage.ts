import { Page, expect, Locator } from '@playwright/test';

export class ResourcesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/resources');
    await expect(this.page).toHaveURL(/resources/);
  }

  async switchToMachines() {
    await this.page.click('button:has-text("Machines")');
  }

  async switchToOperators() {
    await this.page.click('button:has-text("Operators")');
  }

  operatorRowFor(name: string): Locator {
    return this.page.locator('[data-testid="operator-row"]', { hasText: name });
  }

  machineRowFor(name: string): Locator {
    return this.page.locator('[data-testid="machine-row"]', { hasText: name });
  }

  async addOperator(data: { employeeId: string; name: string; skills?: string }) {
    await this.page.click('button:has-text("+ Add Operator")');
    await this.page.fill('input[name="employeeId"]', data.employeeId);
    await this.page.fill('input[name="name"]', data.name);
    if (data.skills) await this.page.fill('input[name="skills"]', data.skills);
    await this.page.click('button[type="submit"]:has-text("Save")');
  }

  async addMachine(data: { machineCode: string; name: string; type: string }) {
    await this.page.click('button:has-text("+ Add Machine")');
    await this.page.fill('input[name="machineCode"]', data.machineCode);
    await this.page.fill('input[name="name"]', data.name);
    await this.page.fill('input[name="type"]', data.type);
    await this.page.click('button[type="submit"]:has-text("Save")');
  }

  async markAbsent(name: string) {
    await this.operatorRowFor(name)
      .locator('button:has-text("Mark Absent")')
      .click();
  }

  async setMaintenance(name: string) {
    await this.machineRowFor(name)
      .locator('button:has-text("Set Maintenance")')
      .click();
  }

  async deleteOperator(name: string) {
    await this.operatorRowFor(name)
      .locator('button:has-text("Delete")')
      .click();
  }

  async deleteMachine(name: string) {
    await this.machineRowFor(name)
      .locator('button:has-text("Delete")')
      .click();
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

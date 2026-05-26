import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    await this.page.fill('input[name="username"]', username);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async expectURL(path: string) {
    await this.page.waitForURL(`**${path}`);
  }

  async expectInlineError(text: string) {
    await expect(this.page.locator('p.text-red-600')).toContainText(text);
  }
}

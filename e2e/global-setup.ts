import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  // 1. Seed the database so every spec starts from a known state
  console.log('[global-setup] Seeding database…');
  const backendDir = path.resolve(__dirname, '..', 'backend');
  execSync('npx prisma db seed', {
    cwd: backendDir,
    env: { ...process.env, PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1' },
    stdio: 'inherit',
  });
  console.log('[global-setup] Database seeded.');

  // 2. Ensure auth directory exists (gitignored — contains session cookies)
  const authDir = path.resolve(__dirname, 'auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const baseURL = (config.projects[0].use.baseURL as string) ?? 'http://localhost:5173';
  const browser = await chromium.launch({ channel: 'chrome' });

  // Helper: log in and persist the storageState (cookies + localStorage) to disk.
  async function captureAuth(username: string, password: string, outFile: string) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/board');
    await ctx.storageState({ path: path.join(authDir, outFile) });
    await ctx.close();
    console.log(`[global-setup] Auth captured: ${outFile}`);
  }

  // 3. Capture both storageState files in parallel — saves ~2–3 s vs sequential.
  await Promise.all([
    captureAuth('supervisor', 'password123', 'supervisor.json'),
    captureAuth('viewer',     'viewer123',   'viewer.json'),
  ]);

  await browser.close();
}

export default globalSetup;

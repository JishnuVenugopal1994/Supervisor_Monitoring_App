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
  // Use system-installed Chrome (channel: 'chrome') to avoid needing a downloaded Chromium binary.
  const browser = await chromium.launch({ channel: 'chrome' });

  // 3. Capture supervisor storageState (includes the httpOnly refreshToken cookie)
  const supCtx = await browser.newContext();
  const supPage = await supCtx.newPage();
  await supPage.goto(`${baseURL}/login`);
  await supPage.fill('input[name="username"]', 'supervisor');
  await supPage.fill('input[name="password"]', 'password123');
  await supPage.click('button:has-text("Sign In")');
  await supPage.waitForURL('**/board');
  await supCtx.storageState({ path: path.join(authDir, 'supervisor.json') });
  await supCtx.close();
  console.log('[global-setup] Supervisor auth captured.');

  // 4. Capture viewer storageState
  const vwrCtx = await browser.newContext();
  const vwrPage = await vwrCtx.newPage();
  await vwrPage.goto(`${baseURL}/login`);
  await vwrPage.fill('input[name="username"]', 'viewer');
  await vwrPage.fill('input[name="password"]', 'viewer123');
  await vwrPage.click('button:has-text("Sign In")');
  await vwrPage.waitForURL('**/board');
  await vwrCtx.storageState({ path: path.join(authDir, 'viewer.json') });
  await vwrCtx.close();
  console.log('[global-setup] Viewer auth captured.');

  await browser.close();
}

export default globalSetup;

import { execSync } from 'child_process';
import path from 'path';

/**
 * Re-seeds the database from backend/prisma/seed.ts.
 * Call in beforeAll() for any spec that mutates data to ensure a clean slate.
 */
export function reseedDB(): void {
  const backendDir = path.resolve(__dirname, '..', '..', 'backend');
  execSync('npx prisma db seed', {
    cwd: backendDir,
    env: { ...process.env, PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1' },
    stdio: 'pipe',
  });
}

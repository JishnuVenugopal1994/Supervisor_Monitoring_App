import { defineConfig, devices } from '@playwright/test';

// Specs that manipulate shared session/db state and must stay sequential.
const SEQUENTIAL_SPECS = [
  '**/01-auth.spec.ts',
  '**/05-board-supervisor.spec.ts',
  '**/09-realtime.spec.ts',
];

// All remaining specs are read-only or fully self-isolated and can run in parallel.
const PARALLEL_SPECS = [
  '**/02-nav.spec.ts',
  '**/03-board-viewer.spec.ts',
  '**/04-role-access.spec.ts',
  '**/06-work-orders.spec.ts',
  '**/07-resources.spec.ts',
  '**/08-materials.spec.ts',
  '**/10-error-handling.spec.ts',
];

const SHARED_USE = {
  baseURL: 'http://localhost:5173',
  headless: true,
  viewport: { width: 1440, height: 900 } as const,
  // Capture trace on first retry for debugging CI failures
  trace: 'on-first-retry' as const,
  // Capture screenshot on failure
  screenshot: 'only-on-failure' as const,
};

export default defineConfig({
  testDir: './specs',
  // Absorb occasional toast-timing or Socket.IO race flakes
  retries: 1,
  reporter: [['html'], ['list']],
  globalSetup: './global-setup.ts',
  projects: [
    {
      // Specs that share session/db state — must run one at a time.
      name: 'sequential',
      testMatch: SEQUENTIAL_SPECS,
      fullyParallel: false,
      workers: 1,
      use: { ...SHARED_USE, ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      // Specs that are read-only or fully self-contained — safe to run in parallel.
      // Capped at 3 workers to stay within PostgreSQL's default connection pool.
      name: 'parallel',
      testMatch: PARALLEL_SPECS,
      fullyParallel: true,
      workers: 3,
      use: { ...SHARED_USE, ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});

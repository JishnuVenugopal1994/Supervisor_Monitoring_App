---
description: "Use when writing Jest unit tests, integration tests, or test utilities for backend services, controllers, or middleware. Covers Prisma mocking, what to test per domain, test file structure, and naming conventions."
applyTo: ["backend/src/**/*.test.ts", "backend/src/**/*.spec.ts", "backend/__tests__/**"]
---

# Testing Conventions (Backend — Jest)

## Test File Location
Co-locate unit tests with the file they test:
```
backend/src/services/allocationService.ts
backend/src/services/allocationService.test.ts   ← same folder

backend/src/controllers/workOrderController.ts
backend/src/controllers/workOrderController.test.ts
```
Integration tests (route-level) live in `backend/__tests__/`:
```
backend/__tests__/allocations.test.ts
backend/__tests__/auth.test.ts
```

## Prisma Client Mocking (Unit Tests)
Never connect to a real database in unit tests. Use `jest-mock-extended` to mock the Prisma client:
```ts
// src/__mocks__/prisma.ts
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

export const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prismaMock);
});
```
Configure `jest.config.ts` to auto-mock Prisma:
```ts
moduleNameMapper: {
  '../prisma': '<rootDir>/src/__mocks__/prisma.ts',
}
```

## What to Unit Test — Per Domain

### allocationService (most critical)
- ✅ Rejects overlapping operator allocations (mock returns existing allocation)
- ✅ Rejects overlapping machine allocations
- ✅ Rejects material over-reservation (mock returns low stock)
- ✅ Creates allocation when all checks pass
- ✅ Restores material quantity and resets operator/machine status on delete
- ✅ Re-runs all conflict checks on PATCH (update), excluding self
- ✅ PATCH with changed operatorId checks the NEW operator, not the old one

### workOrderService
- ✅ Allows valid status transitions (PENDING→IN_PROGRESS, IN_PROGRESS→COMPLETED, etc.)
- ✅ Throws on invalid transitions (e.g., PENDING→COMPLETED, COMPLETED→anything)
- ✅ Throws on COMPLETED→any transition (terminal state)

### operatorService / machineService
- ✅ Availability query returns resources with no overlapping allocations
- ✅ Availability query excludes ABSENT operators / MAINTENANCE machines

### materialService
- ✅ Stock adjustment increments/decrements correctly
- ✅ Throws if adjustment would make quantityOnHand negative

### authService
- ✅ Returns signed JWT on valid credentials
- ✅ Throws on invalid password (bcrypt.compare returns false)
- ✅ Throws on unknown username

## Unit Test Structure
```ts
// allocationService.test.ts
import { allocationService } from './allocationService';
import { prismaMock } from '../__mocks__/prisma';
import { ConflictError } from '../errors/ConflictError';

describe('allocationService.create', () => {
  it('throws OPERATOR_CONFLICT when operator has overlapping allocation', async () => {
    prismaMock.allocation.findFirst.mockResolvedValue({ id: 'existing', startTime: ..., endTime: ... });

    await expect(
      allocationService.create({ operatorId: 'op1', startTime: ..., endTime: ..., workOrderId: 'wo1' })
    ).rejects.toThrow(ConflictError);
  });

  it('creates allocation when operator is free', async () => {
    prismaMock.allocation.findFirst.mockResolvedValue(null);
    prismaMock.material.findUniqueOrThrow.mockResolvedValue({ quantityOnHand: 100 });
    prismaMock.$transaction.mockImplementation(fn => fn(prismaMock));
    prismaMock.allocation.create.mockResolvedValue({ id: 'new-alloc', ... });

    const result = await allocationService.create({ ... });
    expect(result.id).toBe('new-alloc');
  });
});
```

## Integration Tests (Route-level)
Use `supertest` + a real test database (separate `TEST_DATABASE_URL`) for integration tests:
```ts
// __tests__/allocations.test.ts
import request from 'supertest';
import { app } from '../src/app';

describe('POST /api/allocations', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).post('/api/allocations').send({});
    expect(res.status).toBe(401);
  });

  it('returns 403 when VIEWER role tries to create', async () => {
    const token = signTestToken({ role: 'VIEWER' });
    const res = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${token}`)
      .send({ ... });
    expect(res.status).toBe(403);
  });
});
```

## Test Naming Convention
Use descriptive `it()` strings that read as plain English requirements:
```ts
// ✅ Good
it('returns 409 when operator has overlapping allocation')
it('restores material quantity when allocation is deleted')
it('allows IN_PROGRESS → ON_HOLD transition')

// ❌ Bad
it('test conflict')
it('works correctly')
```

## What NOT to Test
- Prisma query syntax (trust the ORM)
- Express middleware internals (test behavior via supertest, not internal wiring)
- React component rendering in the backend test suite

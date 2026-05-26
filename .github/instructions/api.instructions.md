---
description: "Use when writing backend Express routes, controllers, services, or middleware. Covers controller/service separation, error response shape, auth middleware usage, and route registration patterns."
applyTo: "backend/src/**/*.ts"
---

# Backend API Conventions

## Async Error Handling
All async controllers must be wrapped with `asyncHandler` so rejections reach the global `errorHandler`:
```ts
import { asyncHandler } from '../middleware/asyncHandler';

// In route file:
router.post('/', authMiddleware, roleGuard('SUPERVISOR'), asyncHandler(controller.create));
```
Never use bare `async` functions on routes without this wrapper — unhandled rejections will crash the server.

## Request Body Validation (Zod)
Validate `req.body` at the controller boundary before passing to the service:
```ts
import { z } from 'zod';

const CreateWorkOrderSchema = z.object({
  orderNumber: z.string().min(1),
  title: z.string().min(1),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  targetQty: z.number().int().positive(),
});

export const create = async (req: Request, res: Response) => {
  const body = CreateWorkOrderSchema.parse(req.body); // ZodError → caught by errorHandler → 400
  const result = await workOrderService.create(body);
  res.status(201).json(result);
};
```
The global `errorHandler` must handle `ZodError` and return it as a 400 with field-level messages.

## Socket.IO `io` Instance
The `io` instance is a module-level singleton exported from `src/socket/index.ts`. Import it in controllers:
```ts
import { io } from '../socket';

// After DB write:
io.to('shop-floor').emit('allocation:created', allocation);
```
Never create a new `Server` instance in a controller. Never pass `io` as a parameter through services.

## Availability Query Endpoints
Operators and Machines expose an availability filter used by the drag-and-drop panel:
```
GET /api/operators?available=true&from=2024-01-01T08:00:00Z&to=2024-01-01T16:00:00Z
GET /api/machines?available=true&from=...&to=...
```
The service layer queries for resources that have NO overlapping allocation in the requested window:
```ts
where: {
  NOT: {
    allocations: {
      some: { startTime: { lt: to }, endTime: { gt: from } },
    },
  },
}
```

## Controller Rules — Keep Them Thin
Controllers must only: parse the request, call a service, and return the response.
No business logic, no direct Prisma calls, no conflict checks inside controllers.

```ts
// ✅ Correct
export const createAllocation = async (req: Request, res: Response) => {
  const body = CreateAllocationSchema.parse(req.body); // validate first
  const allocation = await allocationService.create(body, req.user!.id);
  io.to('shop-floor').emit('allocation:created', allocation);
  res.status(201).json(allocation);
};

// ❌ Wrong — business logic in controller
export const createAllocation = async (req: Request, res: Response) => {
  const conflict = await prisma.allocation.findFirst({ where: { ... } });
  if (conflict) return res.status(409).json({ error: 'Conflict' });
  // ...
};
```

## Service Layer Rules
- All conflict checks, domain validation, and transactions live in `src/services/`
- Service functions throw typed errors; controllers catch and translate to HTTP responses
- Services must never import `req`, `res`, or anything from Express
- Services must never emit Socket.IO events — only controllers do

## Error Response Shape
Always return structured errors — never bare strings or stack traces:
```ts
// 400 / 422
res.status(400).json({ error: 'scheduledStart must be before scheduledEnd' });

// 409 Conflict
res.status(409).json({
  error: 'Operator is already allocated during this time window',
  code: 'OPERATOR_CONFLICT',
  conflicts: [{ allocationId: '...', startTime: '...', endTime: '...' }],
});

// 404
res.status(404).json({ error: 'WorkOrder not found' });
```

## Auth Middleware Usage
```ts
// Read-only endpoint — auth required, any role
router.get('/', authMiddleware, controller.list);

// Mutating endpoint — SUPERVISOR role required
router.post('/', authMiddleware, roleGuard('SUPERVISOR'), controller.create);
router.patch('/:id', authMiddleware, roleGuard('SUPERVISOR'), controller.update);
router.delete('/:id', authMiddleware, roleGuard('SUPERVISOR'), controller.remove);
```
Never skip `authMiddleware` on any endpoint that returns business data.

## Route File Pattern
Each domain gets its own router file in `src/routes/`:
```ts
// src/routes/allocations.ts
import { Router } from 'express';
import * as controller from '../controllers/allocationController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();
router.get('/', authMiddleware, controller.list);
router.post('/', authMiddleware, roleGuard('SUPERVISOR'), controller.create);
router.patch('/:id', authMiddleware, roleGuard('SUPERVISOR'), controller.update);
router.delete('/:id', authMiddleware, roleGuard('SUPERVISOR'), controller.remove);
export default router;
```

## Socket.IO Events — Emit After DB Write
```ts
// After successful create/update/delete, emit to the shop-floor room
io.to('shop-floor').emit('allocation:created', allocation);
io.to('shop-floor').emit('allocation:updated', allocation);
io.to('shop-floor').emit('allocation:deleted', { id });
io.to('shop-floor').emit('workOrder:statusChanged', { id, status });
io.to('shop-floor').emit('resource:statusChanged', { type, id, status });
```

## Global errorHandler (`src/middleware/errorHandler.ts`)
This is the single place all errors are translated to HTTP responses:
```ts
import { ZodError } from 'zod';
import { ConflictError } from '../errors/ConflictError';
import { Prisma } from '@prisma/client';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', issues: err.flatten().fieldErrors });
  }
  if (err instanceof ConflictError) {
    return res.status(409).json({ error: err.message, code: err.code, conflicts: err.conflicts });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }
  // Never leak stack traces in production
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(500).json({ error: message });
};
```
Register it last in `app.ts`, after all routes: `app.use(errorHandler);`

## Auth Routes (Special Case)
Auth endpoints in `src/routes/auth.ts` do **not** use `authMiddleware` or `roleGuard` — they are the entry point:
```ts
// POST /api/auth/login — public
router.post('/login', asyncHandler(authController.login));

// POST /api/auth/refresh — reads httpOnly cookie, no auth header needed
router.post('/refresh', asyncHandler(authController.refresh));

// POST /api/auth/logout — clears cookie, no role check needed
router.post('/logout', asyncHandler(authController.logout));
```

Auth controller patterns:
- **login**: validate credentials with `bcrypt.compare`, sign a short-lived access JWT and a long-lived refresh JWT, set refresh as httpOnly cookie with `res.cookie('refreshToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 })`
- **refresh**: read `req.cookies.refreshToken`, verify it with `JWT_REFRESH_SECRET`, issue new access token (rotate refresh token too)
- **logout**: `res.clearCookie('refreshToken')` and return 204

## Non-Allocation Service Domains
WorkOrder, Operator, Machine, and Material services follow the **exact same service pattern** as allocationService (minus conflict detection). Each service owns its domain:
- `workOrderService` — status transitions, `PENDING → IN_PROGRESS → COMPLETED | ON_HOLD` only
- `operatorService` — status management, availability queries
- `machineService` — status management, availability queries  
- `materialService` — stock queries, quantity adjustments

Status transitions for WorkOrder are strictly enforced in `workOrderService` — the service throws if an invalid transition is attempted:
```ts
const ALLOWED_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  PENDING:     ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED', 'ON_HOLD'],
  ON_HOLD:     ['IN_PROGRESS'],
  COMPLETED:   [], // terminal — no transitions allowed
};
```

Material stock adjustment endpoint (SUPERVISOR only):
```
PATCH /api/materials/:id
Body: { quantityOnHand: number }   ← direct set by supervisor (manual correction)
```
This is a direct override of `quantityOnHand`, not a delta. The service validates that the resulting value is ≥ 0. It does NOT bypass the allocation reservation — active allocations' reserved quantities are not recalculated on a manual adjustment. If the supervisor sets stock below currently-reserved amounts, the system allows it (it's a manual override); only new reservations are blocked.

Operator and Machine status endpoints for manual overrides (SUPERVISOR only):
```
PATCH /api/operators/:id        Body: { status: 'ABSENT' }       ← manual mark
PATCH /api/machines/:id         Body: { status: 'MAINTENANCE' }  ← manual mark
```
`ASSIGNED` and `RUNNING` are set only by allocationService — never accepted directly from the client.

## HTTP Status Codes
| Scenario | Status |
|---|---|
| Successful create | 201 |
| Successful read / update | 200 |
| Successful delete | 204 |
| Validation error | 400 |
| Unauthenticated | 401 |
| Forbidden (wrong role) | 403 |
| Not found | 404 |
| Conflict (double-booking) | 409 |
| Server error | 500 |

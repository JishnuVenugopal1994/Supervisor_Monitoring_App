# Shop Floor Resource Allocation — Project Guidelines

## Project Overview
Full-stack MVP that lets manufacturing supervisors assign operators, machines, and materials to work orders via a drag-and-drop board, with real-time sync and JWT-based auth.

## Monorepo Structure
```
/
├── frontend/        React + TypeScript + Vite + TailwindCSS + Zustand + @dnd-kit
├── backend/         Node.js + Express + TypeScript + Prisma + Socket.IO + Jest
│   └── prisma/      schema.prisma, migrations/, seed.ts
└── .env.example     placeholder env vars — never commit actual .env files
```

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand (state), @dnd-kit (drag-and-drop), React Router v6, axios
- **Backend**: Node.js, Express, TypeScript, Prisma ORM (PostgreSQL), Socket.IO, JSON Web Tokens
- **Database**: PostgreSQL (local instance), Prisma migrations
- **Auth**: JWT access token (memory) + httpOnly refresh cookie; roles: `SUPERVISOR` | `VIEWER`
- **Real-time**: Socket.IO, room: `shop-floor`

## Domain Entities
- `WorkOrder` — orderNumber, title, status (PENDING | IN_PROGRESS | COMPLETED | ON_HOLD), scheduledStart/End, targetQty
  - Status transitions are enforced in `workOrderService`: PENDING→IN_PROGRESS, IN_PROGRESS→COMPLETED|ON_HOLD, ON_HOLD→IN_PROGRESS. COMPLETED is terminal.
- `Operator` — employeeId, name, skills[], status (AVAILABLE | ASSIGNED | ABSENT)
  - ABSENT is set manually by a supervisor. ASSIGNED is set by allocation. AVAILABLE is restored when no active allocations remain.
  - `skills` is a display/filter tag — used in the resource panel to filter operators by skill. Not enforced as a requirement for allocation.
- `Machine` — machineCode, name, type, status (AVAILABLE | RUNNING | MAINTENANCE)
  - MAINTENANCE is set manually. RUNNING is set by allocation. AVAILABLE is restored when no active allocations remain.
- `Material` — sku, name, unitOfMeasure, quantityOnHand
  - `quantityOnHand` is the physical stock on hand. It is **decremented** when an allocation reserves materials and **incremented** on allocation delete. It is never a "remaining" field — it reflects actual inventory.
- `Allocation` — links WorkOrder ↔ Operator/Machine + time window; `createdBy` (userId of the supervisor who created it)
- `AllocationMaterial` — links Allocation ↔ Material with quantityRequired
- `User` — username, passwordHash, role

## Architecture Conventions

### Backend
- **Thin controllers**: controllers only parse request, call service, return response — no business logic
- **Service layer owns logic**: all conflict checks, transactions, and domain rules live in `src/services/`. Every domain (WorkOrders, Operators, Machines, Materials, Allocations, Auth) has its own service file. No domain is special.
- **All mutations require `roleGuard('SUPERVISOR')`** middleware; read endpoints require `authMiddleware` only; auth routes (`/login`, `/refresh`, `/logout`) require neither
- **Error shape**: `{ error: string, code?: string, conflicts?: [...] }` — always return structured errors
- **Prisma transactions**: use `prisma.$transaction(async (tx) => { ... })` (interactive form) for any write that touches multiple tables — the array form is only for independent, non-conditional operations
- **Socket.IO events**: emit from controllers after successful DB writes, never from services

### Frontend
- **Zustand store per domain**: `allocationStore`, `workOrderStore`, `resourceStore` — no single global store
- **`useSocket` hook**: single hook manages Socket.IO connection, subscribes to `shop-floor` room, dispatches events to relevant Zustand stores
- **Optimistic updates**: apply to local store immediately on drag-drop, rollback on API error
- **Tailwind only**: no CSS modules or inline styles — use Tailwind utility classes
- **Component folders**: each component in its own folder with `index.tsx` + co-located types if needed

## Role Capabilities (VIEWER vs SUPERVISOR)
| Page / Action | SUPERVISOR | VIEWER |
|---|---|---|
| Board — view allocations | ✅ | ✅ |
| Board — drag-assign / re-assign | ✅ | ❌ (read-only, no drag handles) |
| Work Orders — view list | ✅ | ✅ |
| Work Orders — create / edit / delete | ✅ | ❌ |
| Resources — view operators & machines | ✅ | ✅ |
| Resources — add / edit / set status | ✅ | ❌ |
| Materials — view stock | ✅ | ✅ |
| Materials — adjust quantity | ✅ | ❌ |

VIEWER role sees all data but has no mutation controls. Hide buttons/drag handles based on `useAuth().user.role`.

## Pagination
For MVP, **do not implement pagination**. All list endpoints return the full dataset. The seed data is sized (≤20 work orders, ≤15 operators, ≤10 machines, ≤30 materials) to make this safe. Add pagination only if data volume becomes a concern post-MVP.

## Environment Variables
Required in `backend/.env` (see `.env.example`):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shopfloor
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<different-strong-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=4000
CORS_ORIGIN=http://localhost:5173
```
Required in `frontend/.env`:
```
VITE_API_URL=http://localhost:4000
```

## App Entry Point Split (`backend/src/`)
- **`app.ts`** — creates and configures the Express app (middleware, routes, errorHandler). Exports `app`.
- **`index.ts`** — imports `app`, creates the `http.Server`, attaches Socket.IO, starts listening. Never put route logic here.

## CORS
The Express app must set CORS before any routes:
```ts
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
```
`credentials: true` is required for the httpOnly refresh cookie to be sent cross-origin.

## Async Error Handling
All async controller functions must be wrapped so unhandled rejections reach the global `errorHandler`:
```ts
// src/middleware/asyncHandler.ts
export const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```
Use it on every controller: `router.post('/', authMiddleware, roleGuard('SUPERVISOR'), asyncHandler(controller.create));`

## Request Validation (Zod)
Validate request bodies at the controller boundary using Zod — never trust `req.body` directly:
```ts
const CreateAllocationSchema = z.object({
  workOrderId: z.string().cuid(),
  operatorId: z.string().cuid().optional(),
  machineId: z.string().cuid().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  materials: z.array(z.object({
    materialId: z.string().cuid(),
    quantityRequired: z.number().positive(),
  })).optional().default([]),
});
// In controller:
const body = CreateAllocationSchema.parse(req.body); // throws ZodError → caught by errorHandler
```

## Build & Test Commands
```bash
# Backend
cd backend && npm install
npm run dev          # ts-node-dev watch mode
npm test             # Jest unit tests
npx prisma migrate dev   # run new migration
npx prisma db seed       # seed database

# Frontend
cd frontend && npm install
npm run dev          # Vite dev server (port 5173)
```
PostgreSQL must be running locally on port 5432 with database `shopfloor` created before running `prisma migrate dev`.

## Key Constraints (Never Violate)
1. An operator cannot be double-booked — overlapping time windows for the same `operatorId` must be rejected with HTTP 409
2. A machine cannot be double-booked — same constraint
3. Material allocation is a reservation — `quantityRequired` must be ≤ `quantityOnHand` before confirming
4. JWT access tokens must never be stored in `localStorage` — memory only
5. Refresh tokens must be httpOnly cookies — never exposed to JavaScript

## Out of Scope — Do Not Implement
These are explicitly excluded from the MVP. Do not add them, even if they seem helpful:
- **No pagination** — all list endpoints return the full dataset; seed data is sized to make this safe
- **No shift templates or recurring schedules**
- **No cost tracking, labour rates, or budget fields** — do not add cost to any entity
- **No ERP / MES integration** (SAP, Oracle, etc.)
- **No email or SMS notifications** — toast messages are the only notification mechanism
- **No reporting dashboards or analytics charts** — the board and list pages are sufficient
- **No mobile-specific layouts** — desktop browser only for MVP
- **No file uploads or document attachments**

If a future request asks for any of these, flag it as out of scope for MVP rather than implementing it.

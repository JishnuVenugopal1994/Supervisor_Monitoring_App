# Shop Floor Resource Allocation

A full-stack MVP that lets manufacturing supervisors assign operators, machines, and materials to work orders via a drag-and-drop board, with real-time sync across sessions.

---

## Features

- **Allocation Board** — kanban-style columns per work order; drag cards between columns to reassign
- **Resource Panel** — click-to-assign available operators and machines; filter operators by skill
- **Conflict detection** — double-booking an operator or machine returns HTTP 409 with a structured conflict payload; the UI shows the error toast and rolls back the optimistic update
- **Material reservation** — allocating materials decrements stock; deleting an allocation restores it
- **Real-time sync** — Socket.IO broadcasts every create/update/delete to all open sessions in the `shop-floor` room
- **JWT auth** — 15-minute access token in memory + 7-day httpOnly refresh cookie; silent session restore on page reload
- **Role-based access** — `SUPERVISOR` can mutate everything; `VIEWER` sees all data but has no mutation controls

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Zustand, @dnd-kit, React Router v6, axios |
| Backend | Node.js, Express, TypeScript, Prisma ORM, Socket.IO, Zod, jsonwebtoken, bcryptjs |
| Database | PostgreSQL |
| Testing | Jest + jest-mock-extended (unit), Playwright (E2E) |

---

## Project Structure

```
/
├── frontend/          React + Vite app (port 5173)
├── backend/           Express API + Socket.IO server (port 4000)
│   └── prisma/        schema.prisma, migrations/, seed.ts
├── e2e/               Playwright E2E test suite
└── .env.example       Environment variable template
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL running locally on port 5432

### 1. Clone and install dependencies

```bash
git clone https://github.com/JishnuVenugopal1994/Supervisor_Monitoring_App.git
cd Supervisor_Monitoring_App

cd backend && npm install
cd ../frontend && npm install
cd ../e2e && npm install
```

### 2. Configure environment variables

```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env and set a strong JWT_SECRET and JWT_REFRESH_SECRET

# Frontend
echo "VITE_API_URL=http://localhost:4000" > frontend/.env
```

Required variables in `backend/.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing access tokens (use a strong random value) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (different from JWT_SECRET) |
| `JWT_EXPIRES_IN` | Access token TTL (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (default: `7d`) |
| `PORT` | Backend port (default: `4000`) |
| `CORS_ORIGIN` | Frontend origin (default: `http://localhost:5173`) |

### 3. Set up the database

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

The seed creates:
- 2 users: `supervisor` / `password123` and `viewer` / `viewer123`
- 5 work orders, 6 operators, 4 machines, 10 materials

### 4. Start the servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** and log in as `supervisor` / `password123`.

---

## Running Tests

### Backend unit tests (Jest)

```bash
cd backend
npm test
```

Covers: allocation conflict detection, material reservation, status transitions, JWT auth.

### E2E tests (Playwright)

The backend and frontend must both be running before executing the E2E suite.

```bash
cd e2e
npx playwright test
```

To run a specific spec:

```bash
npx playwright test specs/01-auth.spec.ts
```

To open the HTML report after a run:

```bash
npx playwright show-report
```

---

## API Overview

All endpoints require `Authorization: Bearer <accessToken>` except auth routes.  
All mutation endpoints require the `SUPERVISOR` role.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate; returns access token + sets refresh cookie |
| POST | `/api/auth/refresh` | Rotate tokens using httpOnly refresh cookie |
| POST | `/api/auth/logout` | Clear refresh cookie |
| GET | `/api/work-orders` | List all work orders |
| POST | `/api/work-orders` | Create work order |
| PATCH | `/api/work-orders/:id` | Update work order fields |
| PATCH | `/api/work-orders/:id/status` | Transition status (enforces allowed paths) |
| DELETE | `/api/work-orders/:id` | Delete work order |
| GET | `/api/allocations` | List allocations (filterable by workOrderId) |
| POST | `/api/allocations` | Create allocation (runs conflict checks) |
| PATCH | `/api/allocations/:id` | Update allocation |
| DELETE | `/api/allocations/:id` | Delete allocation (restores stock & statuses) |
| GET | `/api/operators` | List operators |
| POST | `/api/operators` | Add operator |
| PATCH | `/api/operators/:id` | Update operator |
| PATCH | `/api/operators/:id/status` | Set operator status (ABSENT/AVAILABLE) |
| GET | `/api/machines` | List machines |
| POST | `/api/machines` | Add machine |
| PATCH | `/api/machines/:id` | Update machine |
| PATCH | `/api/machines/:id/status` | Set machine status (MAINTENANCE/AVAILABLE) |
| GET | `/api/materials` | List materials |
| POST | `/api/materials` | Add material |
| PATCH | `/api/materials/:id` | Update material |

### Error response shape

```json
{
  "error": "Human-readable message",
  "code": "OPERATOR_CONFLICT",
  "conflicts": [
    { "allocationId": "...", "startTime": "...", "endTime": "..." }
  ]
}
```

---

## Socket.IO Events

All events are emitted to the `shop-floor` room. Clients must pass a valid JWT in `socket.handshake.auth.token`.

| Event | Payload | Triggered by |
|---|---|---|
| `allocation:created` | `Allocation` | POST /api/allocations |
| `allocation:updated` | `Allocation` | PATCH /api/allocations/:id |
| `allocation:deleted` | `{ id }` | DELETE /api/allocations/:id |
| `workOrder:updated` | `WorkOrder` | PATCH /api/work-orders/:id/status |
| `resource:statusChanged` | `{ type, id, status }` | Any allocation mutation that changes operator/machine status |

---

## Status Transition Rules

### Work order
```
PENDING → IN_PROGRESS → COMPLETED (terminal)
                      → ON_HOLD → IN_PROGRESS
```

### Operator
- `AVAILABLE` → `ASSIGNED` (on allocation create)
- `ASSIGNED` → `AVAILABLE` (when last allocation is deleted)
- `ABSENT` set manually by supervisor; clears back to `AVAILABLE` manually

### Machine
- `AVAILABLE` → `RUNNING` (on allocation create)
- `RUNNING` → `AVAILABLE` (when last allocation is deleted)
- `MAINTENANCE` set manually; clears back to `AVAILABLE` manually

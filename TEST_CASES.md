# E2E Test Cases — Shop Floor Resource Allocation

**Total: 77 test cases across 10 suites, split across 3 files**

| File | Suites | Cases |
|---|---|---|
| `TEST_CASES.md` (this file) | Master index, Prerequisites, Seed Data | — |
| `TEST_CASES_AUTH_BOARD.md` | TC-AUTH, TC-NAV, TC-BOARD-SUP, TC-BOARD-VIW | 32 |
| `TEST_CASES_FEATURES.md` | TC-WO, TC-RES, TC-MAT, TC-ROLE, TC-RT, TC-ERR | 45 |

---

## Prerequisites

| Step | Action |
|---|---|
| 1 | Add all `data-testid` attributes listed in `.github/instructions/playwright-mcp.instructions.md` to the frontend components |
| 2 | Run `cd backend && npx prisma db seed` to populate seed data |
| 3 | Start backend: `.\start-backend.ps1` (port 4000) |
| 4 | Start frontend: `.\start-frontend.ps1` (port 5173) |
| 5 | Re-run `npx prisma db seed` before any suite requiring clean allocation state (TC-BOARD-SUP-13, TC-BOARD-SUP-14) |

---

## Credentials

| Role | Username | Password |
|---|---|---|
| SUPERVISOR | `supervisor` | `password123` |
| VIEWER | `viewer` | `viewer123` |

---

## Seed Data (after `npx prisma db seed`)

**Work Orders**

| orderNumber | Title | Status | Time Window |
|---|---|---|---|
| WO-001 | Assemble Drive Unit A | PENDING | now+1h → now+5h |
| WO-002 | Weld Frame Section B | IN_PROGRESS | now-2h → now+3h |
| WO-003 | Quality Inspection Line 1 | PENDING | now+6h → now+8h |
| WO-004 | Paint Booth Run C | ON_HOLD | now+8h → now+12h |
| WO-005 | Pack & Ship Order #4421 | PENDING | now+9h → now+10h |

> WO-001 (now+1h→now+5h) and WO-002 (now-2h→now+3h) have **overlapping time windows** — use this pair for all double-booking conflict tests.

**Operators**

| employeeId | Name | Skills | Initial Status |
|---|---|---|---|
| EMP-001 | Alice Nguyen | welding, assembly | AVAILABLE |
| EMP-002 | Bob Carter | painting, quality | AVAILABLE |
| EMP-003 | Carmen Silva | assembly, packing | AVAILABLE |
| EMP-004 | David Osei | welding | ABSENT |
| EMP-005 | Elena Petrova | quality, inspection | AVAILABLE |
| EMP-006 | Frank Müller | machining, assembly | AVAILABLE |

**Machines**

| machineCode | Name | Type | Initial Status |
|---|---|---|---|
| MCH-001 | Welding Robot Arm 1 | Welding | AVAILABLE |
| MCH-002 | CNC Mill Alpha | Machining | MAINTENANCE |
| MCH-003 | Paint Booth 1 | Painting | AVAILABLE |
| MCH-004 | Assembly Line A | Assembly | AVAILABLE |
| MCH-005 | Conveyor Pack 1 | Packing | AVAILABLE |

---

## Legend

| Field | Values |
|---|---|
| **Type** | Positive · Negative · Edge · Security · Realtime · Rollback |
| **Role** | SUP = Supervisor · VWR = Viewer · ANY = Either role · BOTH = test with both |
| **Priority** | High · Medium · Low |

---

## Full Summary Table

| ID | Suite | Test Name | Type | Role | Priority |
|---|---|---|---|---|---|
| TC-AUTH-01 | AUTH | Valid supervisor login | Positive | SUP | High |
| TC-AUTH-02 | AUTH | Valid viewer login | Positive | VWR | High |
| TC-AUTH-03 | AUTH | Wrong password shows error toast | Negative | SUP | High |
| TC-AUTH-04 | AUTH | Empty fields — client validation | Negative | ANY | High |
| TC-AUTH-05 | AUTH | Sign In button loading state | Edge | SUP | Medium |
| TC-AUTH-06 | AUTH | Logout clears session and redirects | Security | SUP | High |
| TC-AUTH-07 | AUTH | Already logged in redirected away from /login | Edge | SUP | Medium |
| TC-AUTH-08 | AUTH | Page refresh restores session via refresh cookie | Edge | SUP | Medium |
| TC-AUTH-09 | AUTH | Expired refresh token forces logout to /login | Negative | SUP | Medium |
| TC-NAV-01 | NAV | All nav links route to correct pages | Positive | ANY | High |
| TC-NAV-02 | NAV | Header shows username and role badge | Positive | BOTH | Medium |
| TC-NAV-03 | NAV | Unauthenticated access redirects to /login | Security | — | High |
| TC-BOARD-SUP-01 | BOARD-SUP | Initial board state loads without errors | Positive | SUP | High |
| TC-BOARD-SUP-02 | BOARD-SUP | Only non-COMPLETED orders shown as columns | Positive | SUP | High |
| TC-BOARD-SUP-03 | BOARD-SUP | Assign available operator to work order | Positive | SUP | High |
| TC-BOARD-SUP-04 | BOARD-SUP | Assigned operator becomes non-clickable in ResourcePanel | Edge | SUP | Medium |
| TC-BOARD-SUP-05 | BOARD-SUP | Assign available machine to work order | Positive | SUP | High |
| TC-BOARD-SUP-06 | BOARD-SUP | MAINTENANCE machine is non-clickable in ResourcePanel | Edge | SUP | Medium |
| TC-BOARD-SUP-07 | BOARD-SUP | Filter operators by skill | Positive | SUP | Medium |
| TC-BOARD-SUP-08 | BOARD-SUP | Move allocation to different column via drag | Positive | SUP | High |
| TC-BOARD-SUP-09 | BOARD-SUP | Delete allocation | Positive | SUP | High |
| TC-BOARD-SUP-10 | BOARD-SUP | Unnamed allocation displayed when no resource | Edge | SUP | Low |
| TC-BOARD-SUP-11 | BOARD-SUP | Edit time — end before start shows toast | Negative | SUP | High |
| TC-BOARD-SUP-12 | BOARD-SUP | Edit time — valid range saves and closes | Positive | SUP | High |
| TC-BOARD-SUP-13 | BOARD-SUP | Operator double-booking rejected — OPERATOR_CONFLICT | Negative | SUP | High |
| TC-BOARD-SUP-14 | BOARD-SUP | Machine double-booking rejected — MACHINE_CONFLICT | Negative | SUP | High |
| TC-BOARD-SUP-15 | BOARD-SUP | Assign with no work order selected silently does nothing | Edge | SUP | Medium |
| TC-BOARD-SUP-16 | BOARD-SUP | Empty board shows "No active work orders." message | Edge | SUP | Low |
| TC-BOARD-SUP-17 | BOARD-SUP | Time edit Cancel closes inputs without saving | Edge | SUP | Medium |
| TC-BOARD-VIW-01 | BOARD-VIW | ResourcePanel is absent for viewer | Security | VWR | High |
| TC-BOARD-VIW-02 | BOARD-VIW | Delete button absent on AllocationCards for viewer | Security | VWR | High |
| TC-BOARD-VIW-03 | BOARD-VIW | Allocation cards have no drag handles for viewer | Security | VWR | Medium |
| TC-WO-01 | WO | Create work order — valid | Positive | SUP | High |
| TC-WO-02 | WO | Create work order — empty fields validation | Negative | SUP | High |
| TC-WO-03 | WO | Create work order — end before start validation | Negative | SUP | High |
| TC-WO-04 | WO | Edit work order title | Positive | SUP | High |
| TC-WO-05 | WO | Status transition PENDING → IN_PROGRESS | Positive | SUP | High |
| TC-WO-06 | WO | Status transitions IN_PROGRESS → ON_HOLD → IN_PROGRESS | Positive | SUP | High |
| TC-WO-07 | WO | Status transition IN_PROGRESS → COMPLETED (terminal) | Positive | SUP | High |
| TC-WO-08 | WO | Delete only available when COMPLETED | Positive | SUP | High |
| TC-WO-09 | WO | No status transition links present on board page | Positive | SUP | Medium |
| TC-WO-10 | WO | COMPLETED orders absent from board columns | Positive | SUP | High |
| TC-WO-11 | WO | Cancel New Work Order form closes without saving | Edge | SUP | Medium |
| TC-WO-12 | WO | Cancel Edit form preserves original data | Edge | SUP | Medium |
| TC-WO-13 | WO | targetQty = 0 rejected by API Zod validation | Negative | SUP | Medium |
| TC-WO-14 | WO | Duplicate orderNumber returns error toast | Negative | SUP | Medium |
| TC-RES-01 | RES | Tab navigation Operators ↔ Machines | Positive | SUP | Medium |
| TC-RES-02 | RES | Add operator — valid | Positive | SUP | High |
| TC-RES-03 | RES | Add operator — empty fields validation | Negative | SUP | High |
| TC-RES-04 | RES | Mark operator as ABSENT | Positive | SUP | High |
| TC-RES-05 | RES | Delete operator | Positive | SUP | High |
| TC-RES-06 | RES | Add machine — valid | Positive | SUP | High |
| TC-RES-07 | RES | Add machine — empty fields validation | Negative | SUP | High |
| TC-RES-08 | RES | Set machine to MAINTENANCE | Positive | SUP | High |
| TC-RES-09 | RES | Delete machine | Positive | SUP | High |
| TC-RES-10 | RES | Already-ABSENT operator has no Mark Absent button | Edge | SUP | Medium |
| TC-RES-11 | RES | Cancel Add Operator form closes without saving | Edge | SUP | Medium |
| TC-RES-12 | RES | Cancel Add Machine form closes without saving | Edge | SUP | Medium |
| TC-MAT-01 | MAT | Add material — valid | Positive | SUP | High |
| TC-MAT-02 | MAT | Add material — empty fields validation | Negative | SUP | High |
| TC-MAT-03 | MAT | Adjust quantity — valid | Positive | SUP | High |
| TC-MAT-04 | MAT | Adjust quantity — negative value rejected | Negative | SUP | High |
| TC-MAT-05 | MAT | Adjust quantity — Cancel discards change | Edge | SUP | Medium |
| TC-MAT-06 | MAT | Low stock (qty ≤ 0) shows red text | Edge | SUP | Low |
| TC-MAT-07 | MAT | Cancel Add Material form closes without saving | Edge | SUP | Medium |
| TC-ROLE-01 | ROLE | Viewer has no mutation controls on Work Orders | Security | VWR | High |
| TC-ROLE-02 | ROLE | Viewer has no mutation controls on Resources | Security | VWR | High |
| TC-ROLE-03 | ROLE | Viewer has no mutation controls on Materials | Security | VWR | High |
| TC-ROLE-04 | ROLE | API returns 403 for viewer mutation attempt | Security | VWR | High |
| TC-RT-01 | RT | Allocation created by supervisor appears on viewer board in real-time | Realtime | SUP+VWR | High |
| TC-RT-02 | RT | Work order status change reflects on board in real-time | Realtime | SUP+ANY | Medium |
| TC-RT-03 | RT | Resource status change reflects in ResourcePanel in real-time | Realtime | SUP+SUP | Medium |
| TC-ERR-01 | ERR | Drag rollback restores original column on API failure | Rollback | SUP | High |
| TC-ERR-02 | ERR | ErrorBoundary catches render crash and shows recovery UI | Edge | ANY | Medium |
| TC-ERR-03 | ERR | Expired access token triggers silent refresh and retries | Security | SUP | High |
| TC-ERR-04 | ERR | Delete rollback restores AllocationCard on API failure | Rollback | SUP | Medium |
| TC-ERR-05 | ERR | Time edit rollback restores original times on API failure | Rollback | SUP | Medium |

---

## Known Limitations

| Issue | Current Behaviour | Affected Test(s) | Severity |
|---|---|---|---|
| Duplicate unique fields (`orderNumber`, `employeeId`, `machineCode`, `sku`) | Returns HTTP 500 (`"Internal server error"`) — Prisma P2002 unique constraint not handled in `errorHandler.ts` | TC-WO-14 | Medium |
| `targetQty = 0` passes client-side validation | `parseInt` + falsy check lets `0` through the form; Zod `positive()` rejects at the API. Error toast is shown but message is generic Zod output | TC-WO-13 | Low |
| No success toast on status transitions | `handleTransition()` only calls `toast.error` on failure; badge update is the only success feedback — this is by design | TC-WO-05, TC-WO-06, TC-WO-07 | Low (by design) |
| Material INSUFFICIENT_STOCK conflict has no UI path | No UI on the board to attach materials to an allocation; this conflict can only be tested via direct `POST /api/allocations` API calls | — | Low (scope limitation) |
| Access token is not on `window` | The access token is stored as a module-level variable in `useAuth.ts` — it cannot be read or cleared via `browser_evaluate`. Tests that need to manipulate token state must use `page.route()` interception instead | TC-ERR-03, TC-ROLE-04 | Medium (test design constraint) |
| httpOnly `refreshToken` cookie cannot be cleared via JS | `document.cookie` cannot access httpOnly cookies — tests that need to expire the session must use Playwright's Node.js `context.clearCookies()` API | TC-AUTH-09 | Medium (test design constraint) |
| No `/health` endpoint | Backend exposes no `/health` or `/ping` route — CI readiness checks must use `tcp:` protocol (`wait-on tcp:localhost:4000`) instead of HTTP polling | — | Low (CI setup note) |

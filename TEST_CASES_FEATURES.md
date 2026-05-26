# Test Cases — Features, Roles, Real-time, Error Handling

Part 2 of 2 detailed test case files. See `TEST_CASES.md` for the master index, prerequisites, and seed data.

**Suites in this file:** TC-WO (14 cases) · TC-RES (12 cases) · TC-MAT (7 cases) · TC-ROLE (4 cases) · TC-RT (3 cases) · TC-ERR (5 cases)

---

## TC-WO — Work Orders (14 cases)

| ID | Test Name | Type | Role | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| TC-WO-01 | Create work order — valid | Positive | SUP | Logged in as supervisor; on `/work-orders` | 1. `browser_click` `button >> text="+ New Work Order"` 2. Fill `input[name="orderNumber"]` → `WO-TEST-001` 3. Fill `input[name="title"]` → `Test Order` 4. Fill `input[name="scheduledStart"]` → `2026-06-01T08:00` 5. Fill `input[name="scheduledEnd"]` → `2026-06-01T16:00` 6. Fill `input[name="targetQty"]` → `10` 7. `browser_click` `button >> text="Save"` | New row with `WO-TEST-001` and `PENDING` status badge appears in table; toast `"Work order created"` | High |
| TC-WO-02 | Create work order — empty fields validation | Negative | SUP | On `/work-orders`; form open | 1. `browser_click` `"+ New Work Order"` 2. Leave all fields empty 3. `browser_click` `"Save"` | Inline validation text `"All fields are required"` visible below form; no row added to table; no API call | High |
| TC-WO-03 | Create work order — end before start | Negative | SUP | On `/work-orders`; form open | 1. Open form; fill all fields but set `scheduledEnd` to 1 hour **before** `scheduledStart` 2. `browser_click` `"Save"` | Inline error `"End must be after start"`; no row added; no API call | High |
| TC-WO-04 | Edit work order title | Positive | SUP | On `/work-orders`; at least one WO row visible | 1. `browser_click` `button >> text="Edit"` in WO-001 row 2. Clear `input[name="title"]` and type `Updated Title` 3. `browser_click` `"Save"` | WO-001 row now shows `Updated Title`; toast `"Work order updated"` | High |
| TC-WO-05 | Status transition PENDING → IN_PROGRESS | Positive | SUP | WO-001 is PENDING | 1. `browser_click` `button >> text="→ IN_PROGRESS"` in WO-001 row | WO-001 status badge changes to green `IN_PROGRESS`; row now shows `"→ COMPLETED"` and `"→ ON_HOLD"` buttons; **no success toast** (by design — `handleTransition` has no `toast.success`) | High |
| TC-WO-06 | Status transitions IN_PROGRESS → ON_HOLD → IN_PROGRESS | Positive | SUP | WO-001 is IN_PROGRESS (from TC-WO-05) | 1. `browser_click` `"→ ON_HOLD"` → badge turns orange `ON_HOLD`; only `"→ IN_PROGRESS"` visible 2. `browser_click` `"→ IN_PROGRESS"` → badge returns green `IN_PROGRESS`; `"→ COMPLETED"` and `"→ ON_HOLD"` re-appear | Both transitions complete; no error; **no success toast** on either transition | High |
| TC-WO-07 | Status transition IN_PROGRESS → COMPLETED (terminal) | Positive | SUP | WO-001 is IN_PROGRESS | 1. `browser_click` `"→ COMPLETED"` | Badge turns gray `COMPLETED`; no transition buttons remain in row; `"Delete"` button now appears; **no success toast** | High |
| TC-WO-08 | Delete only available when COMPLETED | Positive | SUP | WOs in various non-COMPLETED states; one COMPLETED WO | 1. `browser_snapshot` all rows — verify non-COMPLETED rows have no Delete 2. On COMPLETED row: `browser_click` `"Delete"` | Non-COMPLETED rows: no `"Delete"` button. After clicking Delete on COMPLETED row: row disappears; toast `"Work order deleted"` | High |
| TC-WO-09 | No status transition links present on board page | Positive | SUP | On `/board` | 1. `browser_navigate` → `/board` 2. `browser_evaluate` → `document.querySelectorAll('button').length` and check for `"→"` text | No `button` with text matching `/^→/` exists anywhere on the board page | Medium |
| TC-WO-10 | COMPLETED orders absent from board columns | Positive | SUP | At least one WO transitioned to COMPLETED | 1. Transition a WO to COMPLETED on `/work-orders` 2. `browser_navigate` → `/board` | COMPLETED WO's column (`[data-testid="work-order-column"]`) is not present; remaining non-COMPLETED columns still visible | High |
| TC-WO-11 | Cancel New Work Order form closes without saving | Edge | SUP | On `/work-orders` | 1. `browser_click` `"+ New Work Order"` 2. Fill some fields partially 3. `browser_click` `"Cancel"` | Form closes immediately; no new row in table; count of rows unchanged | Medium |
| TC-WO-12 | Cancel Edit form preserves original data | Edge | SUP | On `/work-orders`; WO-001 row visible with title `"Assemble Drive Unit A"` | 1. `browser_click` `"Edit"` on WO-001 2. Clear title and type `"Modified Title"` 3. `browser_click` `"Cancel"` | WO-001 row still shows `"Assemble Drive Unit A"`; no API call; `"Modified Title"` nowhere in DOM | Medium |
| TC-WO-13 | targetQty = 0 rejected by API Zod validation | Negative | SUP | On `/work-orders` | 1. Open new WO form 2. Fill all fields validly but set `targetQty` → `0` 3. `browser_click` `"Save"` | Form submits (client allows `0`); API returns 400 Zod validation error; error toast shown; no row added | Medium |
| TC-WO-14 | Duplicate orderNumber returns error toast | Negative | SUP | WO-001 already exists | 1. Open new WO form 2. Set `orderNumber` → `WO-001`; fill all other fields validly 3. `browser_click` `"Save"` | Error toast shown (API returns 500 — P2002 unique constraint not yet handled as 409); no new row. See Known Limitations. | Medium |

---

## TC-RES — Resources (12 cases)

| ID | Test Name | Type | Role | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| TC-RES-01 | Tab navigation Operators ↔ Machines | Positive | SUP | On `/resources` | 1. `browser_navigate` → `/resources` 2. `browser_snapshot` default tab 3. `browser_click` `button >> text="Machines"` 4. `browser_snapshot` | Default tab = Operators: table has `"Employee ID"` column. After clicking Machines tab: table has `"Code"` column; no Operators table visible | Medium |
| TC-RES-02 | Add operator — valid | Positive | SUP | On `/resources`; Operators tab | 1. `browser_click` `"+ Add Operator"` 2. Fill `employeeId` → `EMP-TEST` 3. Fill `name` → `Test Operator` 4. Fill `skills` → `welding,assembly` 5. `browser_click` `"Save"` | New row with `EMP-TEST` and `Test Operator` in table; status chip `AVAILABLE`; toast `"Operator added"` | High |
| TC-RES-03 | Add operator — empty fields validation | Negative | SUP | On `/resources`; add form open | 1. `browser_click` `"+ Add Operator"` 2. Leave all fields empty 3. `browser_click` `"Save"` | Inline error `"Employee ID and name are required"`; no new row; no API call | High |
| TC-RES-04 | Mark operator as ABSENT | Positive | SUP | DB seeded; Alice Nguyen is AVAILABLE | 1. On `/resources` Operators tab 2. `browser_click` text-link `"Mark Absent"` in Alice Nguyen's row | Alice's status chip turns gray `ABSENT`; `"Mark Absent"` button no longer in her row; on `/board`, Alice's row in ResourcePanel shows reduced opacity (`opacity-60`) | High |
| TC-RES-05 | Delete operator | Positive | SUP | On `/resources`; Operators tab | 1. `browser_click` `"Delete"` in any operator row | Row disappears immediately (no confirm dialog); toast `"Operator removed"` | High |
| TC-RES-06 | Add machine — valid | Positive | SUP | On `/resources`; Machines tab | 1. `browser_click` `"Machines"` tab 2. `browser_click` `"+ Add Machine"` 3. Fill `machineCode` → `MCH-TEST` 4. Fill `name` → `Test Machine` 5. Fill `type` → `Assembly` 6. `browser_click` `"Save"` | New row with `MCH-TEST` and `Test Machine`; status chip `AVAILABLE`; toast `"Machine added"` | High |
| TC-RES-07 | Add machine — empty fields validation | Negative | SUP | On `/resources`; Machines tab; add form open | 1. Click `"+ Add Machine"` 2. Leave all fields empty 3. `browser_click` `"Save"` | Inline error `"All fields are required"`; no new row; no API call | High |
| TC-RES-08 | Set machine to MAINTENANCE | Positive | SUP | DB seeded; MCH-001 `"Welding Robot Arm 1"` is AVAILABLE | 1. `browser_click` `"Machines"` tab 2. `browser_click` text-link `"Set Maintenance"` in MCH-001 row | MCH-001 status chip turns red `MAINTENANCE`; `"Set Maintenance"` button no longer in MCH-001 row; on `/board`, MCH-001 row in ResourcePanel shows `cursor-not-allowed` | High |
| TC-RES-09 | Delete machine | Positive | SUP | On `/resources`; Machines tab | 1. `browser_click` `"Delete"` in any machine row | Row disappears immediately (no confirm dialog); toast `"Machine removed"` | High |
| TC-RES-10 | Already-ABSENT operator has no Mark Absent button | Edge | SUP | DB seeded; David Osei (EMP-004) is seeded as ABSENT | 1. `browser_navigate` → `/resources` 2. Find David Osei's row | Row shows gray `ABSENT` chip; **no** `"Mark Absent"` button in his row | Medium |
| TC-RES-11 | Cancel Add Operator form closes without saving | Edge | SUP | On `/resources`; Operators tab | 1. `browser_click` `"+ Add Operator"` 2. Fill `employeeId` → `EMP-CANCEL` 3. `browser_click` `"Cancel"` | Form closes; no row with `EMP-CANCEL` in table; row count unchanged | Medium |
| TC-RES-12 | Cancel Add Machine form closes without saving | Edge | SUP | On `/resources`; Machines tab | 1. `browser_click` `"Machines"` tab 2. `browser_click` `"+ Add Machine"` 3. Fill `machineCode` → `MCH-CANCEL` 4. `browser_click` `"Cancel"` | Form closes; no row with `MCH-CANCEL` in table | Medium |

---

## TC-MAT — Materials (7 cases)

| ID | Test Name | Type | Role | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| TC-MAT-01 | Add material — valid | Positive | SUP | On `/materials` | 1. `browser_click` `"+ Add Material"` 2. Fill `sku` → `MAT-TEST` 3. Fill `name` → `Test Material` 4. Fill `unitOfMeasure` → `pcs` 5. Fill `quantityOnHand` → `50` 6. `browser_click` `"Save"` | New row with `MAT-TEST`, `Test Material`, qty `50`; toast `"Material added"` | High |
| TC-MAT-02 | Add material — empty fields validation | Negative | SUP | On `/materials`; add form open | 1. Click `"+ Add Material"` 2. Leave all fields empty 3. `browser_click` `"Save"` | Inline error `"All fields required"` (or similar); no new row; no API call | High |
| TC-MAT-03 | Adjust quantity — valid | Positive | SUP | On `/materials`; at least one material row | 1. `browser_click` `"Adjust"` in any material row 2. Clear the `input[type="number"]` that appears and type `200` 3. `browser_click` `"Save"` | Row `quantityOnHand` column updates to `200`; toast `"Stock updated"`; input disappears | High |
| TC-MAT-04 | Adjust quantity — negative value rejected | Negative | SUP | On `/materials`; quantity input open | 1. `browser_click` `"Adjust"` 2. Type `-5` 3. `browser_click` `"Save"` | Toast `"Invalid quantity"` (or API error toast); row quantity unchanged; input may remain visible | High |
| TC-MAT-05 | Adjust quantity — Cancel discards change | Edge | SUP | On `/materials`; note current quantity of a row | 1. `browser_click` `"Adjust"` 2. Type `999` 3. `browser_click` `"Cancel"` | `input[type="number"]` disappears; quantity in row unchanged; no API call | Medium |
| TC-MAT-06 | Low stock (qty ≤ 0) shows red text | Edge | SUP | On `/materials`; quantity input open | 1. Adjust a material's quantity to `0` 2. `browser_snapshot` the row 3. Adjust to `1` 4. `browser_snapshot` | At qty `0`: quantity text has `text-red-600` class. At qty `1`: red class removed | Low |
| TC-MAT-07 | Cancel Add Material form closes without saving | Edge | SUP | On `/materials` | 1. `browser_click` `"+ Add Material"` 2. Fill `sku` → `MAT-CANCEL` 3. `browser_click` `"Cancel"` | Form closes; no row with `MAT-CANCEL` in table | Medium |

---

## TC-ROLE — Role Access Control (4 cases)

| ID | Test Name | Type | Role | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| TC-ROLE-01 | Viewer has no mutation controls on Work Orders | Security | VWR | Logged in as viewer; on `/work-orders` | 1. `browser_navigate` → `/work-orders` 2. `browser_snapshot` | No `"+ New Work Order"` button; no `"→ IN_PROGRESS"` / `"→ COMPLETED"` / `"→ ON_HOLD"` buttons; no `"Edit"` buttons; no `"Delete"` buttons anywhere in table | High |
| TC-ROLE-02 | Viewer has no mutation controls on Resources | Security | VWR | Logged in as viewer; on `/resources` | 1. `browser_navigate` → `/resources` 2. `browser_snapshot` Operators tab 3. Click Machines tab 4. `browser_snapshot` | Operators tab: no `"+ Add Operator"`, no `"Mark Absent"`, no `"Delete"`. Machines tab: no `"+ Add Machine"`, no `"Set Maintenance"`, no `"Delete"` | High |
| TC-ROLE-03 | Viewer has no mutation controls on Materials | Security | VWR | Logged in as viewer; on `/materials` | 1. `browser_navigate` → `/materials` 2. `browser_snapshot` | No `"+ Add Material"` button; no `"Adjust"` button on any row; no `"Delete"` button | High |
| TC-ROLE-04 | API returns 403 for viewer mutation attempt | Security | VWR | Logged in as viewer; on `/work-orders` | 1. Use `page.route('**/api/work-orders*', ...)` to intercept the app's own `GET /api/work-orders` request and capture the `authorization` header value from `route.request().headers()` 2. Unroute after capturing 3. Use Playwright `page.request.post('/api/work-orders', { headers: { Authorization: capturedHeader, 'Content-Type': 'application/json' }, data: { orderNumber: 'WO-HACK', title: 'hack', scheduledStart: '...', scheduledEnd: '...', targetQty: 1 } })` 4. Assert response status | Status = `403`; body `{ "error": "Insufficient permissions" }`; no new work order row in table. Note: raw `fetch` from `browser_evaluate` would get `401` (no Authorization header) not `403` — the captured token from the app's own request is required to reach the `roleGuard` | High |

---

## TC-RT — Real-time Sync (3 cases)

| ID | Test Name | Type | Role | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| TC-RT-01 | Allocation created by supervisor appears on viewer board in real-time | Realtime | SUP+VWR | Two browser contexts open: Session A (supervisor), Session B (viewer); both on `/board`; DB seeded | 1. In Session A: navigate to `/board`; wait for `[data-testid="work-order-column"]` to be visible 2. In Session B: navigate to `/board`; **wait for `[data-testid="work-order-column"]` to be visible before proceeding** (ensures Socket.IO has joined `shop-floor` room) 3. In Session A: select WO-001 from dropdown; click Alice Nguyen 4. In Session B: wait for `[data-testid="allocation-card"]` containing `"Alice Nguyen"` to appear (do NOT reload) | Session B shows the new AllocationCard for Alice Nguyen in WO-001 column **without a page reload** | High |
| TC-RT-02 | Work order status change reflects on board in real-time | Realtime | SUP+ANY | Two sessions; both on `/board` | 1. Session A: navigate to `/work-orders`; click `"→ IN_PROGRESS"` on WO-001 2. Session B: `browser_navigate` → `/board`; `browser_snapshot` column header for WO-001 | Session B WO-001 column header badge shows `IN_PROGRESS` without reload | Medium |
| TC-RT-03 | Resource status change reflects in ResourcePanel in real-time | Realtime | SUP+SUP | Two supervisor sessions; both on `/board` | 1. Session A: navigate to `/resources`; click `"Mark Absent"` on Alice Nguyen 2. Session B: `browser_navigate` → `/board`; `browser_snapshot` Alice's row in ResourcePanel | Session B shows Alice's row with `opacity-60` (ABSENT styling) without reload | Medium |

---

## TC-ERR — Error Handling & Rollback (5 cases)

| ID | Test Name | Type | Role | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| TC-ERR-01 | Drag rollback restores original column on API failure | Rollback | SUP | AllocationCard in WO-001 column; intercept PATCH to return 500 | 1. `browser_evaluate` → intercept `fetch` for `PATCH /api/allocations/*` to reject with 500 2. `browser_drag` AllocationCard from WO-001 → WO-003 3. `browser_snapshot` | Card moves optimistically to WO-003 momentarily, then **snaps back** to WO-001; error toast shown; WO-003 column does not retain the card | High |
| TC-ERR-02 | ErrorBoundary catches render crash and shows recovery UI | Edge | ANY | Logged in; on `/board` | 1. `browser_evaluate` → corrupt the Zustand `allocationStore` state: `window.__allocationStore.setState({ allocations: null })` 2. `browser_navigate` → `/board` | `"Something went wrong"` text visible; `"Try again"` button visible; app does not show blank white screen | Medium |
| TC-ERR-03 | Expired access token triggers silent refresh and retries | Security | SUP | Logged in as supervisor | 1. Use `page.route()` to intercept the **first** non-auth API request and return `401` while letting `POST /api/auth/refresh` pass normally: `let hit = false; page.route('**/api/!(auth)**', route => { if (!hit) { hit = true; route.fulfill({ status: 401 }); } else route.continue(); })` 2. `browser_navigate` → `/work-orders` 3. Wait for `[data-testid="work-order-row"]` to appear | Work orders list loads successfully; no redirect to `/login`; the axios 401 interceptor silently called `POST /api/auth/refresh`, obtained a new access token, and retried the original request. Note: the access token is a module-level variable in `useAuth.ts` — it is **not** on `window` and cannot be cleared via `browser_evaluate` | High |
| TC-ERR-04 | Delete rollback restores AllocationCard on API failure | Rollback | SUP | AllocationCard on board; intercept DELETE to return 500 | 1. `browser_evaluate` → intercept `fetch` for `DELETE /api/allocations/*` to return 500 2. `browser_click` `button[title="Remove allocation"]` | Card disappears optimistically then **reappears** in the same column; error toast shown | Medium |
| TC-ERR-05 | Time edit rollback restores original times on API failure | Rollback | SUP | AllocationCard on board; note original time text | 1. `browser_evaluate` → intercept `PATCH /api/allocations/*` to return 500 2. `browser_click` `[title="Click to edit times"]` 3. Enter new valid times 4. `browser_click` `"Save"` | `[title="Click to edit times"]` shows new time optimistically, then **reverts** to original time; error toast shown | Medium |

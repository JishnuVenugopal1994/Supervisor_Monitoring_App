---
applyTo: "e2e/**"
---

# Playwright MCP — E2E Testing Instructions

Use these instructions whenever you are asked to write, run, or debug end-to-end tests for the Shop Floor Resource Allocation app using the Playwright MCP server.

---

## Before You Start — Do These Steps in Order

1. **Add `data-testid` attributes** to the components listed in the final section of this file. Most selectors in these instructions depend on them. Do this before writing any test.
2. **Ensure the app is running** — backend on port 4000, frontend on port 5173.
3. **Seed the database** (`cd backend && npx prisma db seed`) so test data exists.

---

## Playwright MCP Tool Reference

These are the tool names available via the Playwright MCP server. Use them in your test steps:

| Action | Tool |
|---|---|
| Open a URL | `browser_navigate` |
| Read page structure (accessibility tree) | `browser_snapshot` |
| Click an element | `browser_click` |
| Type into an input | `browser_type` |
| Select a `<select>` option | `browser_select_option` |
| Drag one element onto another | `browser_drag` |
| Take a screenshot | `browser_take_screenshot` |
| Run JavaScript in the page | `browser_evaluate` |
| Wait for a condition | `browser_wait_for` |
| Hover over an element | `browser_hover` |

All selector strings you pass to these tools use standard Playwright locator syntax (CSS, text, `>>` chain, `data-testid`).

---

## Seed Data Reference

After running `npx prisma db seed`, these records exist:

**Work Orders**

| orderNumber | title | status |
|---|---|---|
| WO-001 | Assemble Drive Unit A | PENDING |
| WO-002 | Weld Frame Section B | IN_PROGRESS |
| WO-003 | Quality Inspection Line 1 | PENDING |
| WO-004 | Paint Booth Run C | ON_HOLD |
| WO-005 | Pack & Ship Order #4421 | PENDING |

WO-001 (now+1h → now+5h) and WO-002 (now-2h → now+3h) have **overlapping time windows** — use these for double-booking conflict tests.

**Operators**

| employeeId | name | skills | status |
|---|---|---|---|
| EMP-001 | Alice Nguyen | welding, assembly | AVAILABLE |
| EMP-002 | Bob Carter | painting, quality | AVAILABLE |
| EMP-003 | Carmen Silva | assembly, packing | AVAILABLE |
| EMP-004 | David Osei | welding | ABSENT |
| EMP-005 | Elena Petrova | quality, inspection | AVAILABLE |
| EMP-006 | Frank Müller | machining, assembly | AVAILABLE |

**Machines**

| machineCode | name | type | status |
|---|---|---|---|
| MCH-001 | Welding Robot Arm 1 | Welding | AVAILABLE |
| MCH-002 | CNC Mill Alpha | Machining | MAINTENANCE |
| MCH-003 | Paint Booth 1 | Painting | AVAILABLE |
| MCH-004 | Assembly Line A | Assembly | AVAILABLE |
| MCH-005 | Conveyor Pack 1 | Packing | AVAILABLE |

---

## Setup

### 1. Install Playwright and the MCP server

Run from the workspace root:

```powershell
npm init playwright@latest e2e --yes
cd e2e
npm install @playwright/mcp
npx playwright install chromium
```

### 2. Configure the MCP server in VS Code

Add to `.vscode/mcp.json` (create if missing):

```json
{
  "servers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["@playwright/mcp", "--browser", "chromium"]
    }
  }
}
```

### 3. Prerequisites before running any test

The app must already be running:
- Backend: `http://localhost:4000` (run `.\start-backend.ps1`)
- Frontend: `http://localhost:5173` (run `.\start-frontend.ps1`)

> If port 5173 is already in use, Vite will fall back to 5174. Check the terminal output for the actual port.

---

## Credentials

| Role | Username | Password | Can mutate? |
|---|---|---|---|
| Supervisor | `supervisor` | `password123` | Yes |
| Viewer | `viewer` | `viewer123` | No — read-only |

---

## Standard Login Procedure

Every test session must begin with this sequence:

1. Navigate to `http://localhost:5173/login`
2. Fill `input[name="username"]`
3. Fill `input[name="password"]`
4. Click the button with exact text **"Sign In"**
5. Assert the URL changes to `/board`

---

## Critical UI Facts (verify before writing selectors)

These correct assumptions that do not match the actual implementation:

| Assumption | Actual behaviour |
|---|---|
| ResourcePanel is on the right | **It is on the LEFT side of the board** |
| Assign by dragging from ResourcePanel | **Click the operator/machine row** after selecting a work order from the `<select>` dropdown — dragging is only for moving existing AllocationCards between columns |
| Status transitions are on the board | **Only on the Work Orders page** as text links like `"→ IN_PROGRESS"` |
| Work orders can be deleted when PENDING | **Delete only appears when status = COMPLETED** |
| Operator status is a dropdown | **"Mark Absent"** is a text-link button in the operator table row |
| Machine status is a dropdown | **"Set Maintenance"** is a text-link button in the machine table row |
| Deletions have a confirm dialog | **No confirmation — all deletions are immediate** |
| data-testid attributes exist | **Zero data-testid attributes exist** in the codebase — add them first (see end of file) |

---

## Exact Toast Messages (react-hot-toast)

| Action | Toast text |
|---|---|
| Assign resource to work order | `"Resource assigned"` |
| Move allocation to different work order | `"Allocation moved"` |
| Delete allocation | `"Allocation removed"` |
| Create work order | `"Work order created"` |
| Update work order | `"Work order updated"` |
| Delete work order | `"Work order deleted"` |
| Add operator | `"Operator added"` |
| Mark operator absent | `"Operator marked absent"` |
| Delete operator | `"Operator removed"` |
| Add machine | `"Machine added"` |
| Set machine to maintenance | `"Machine set to maintenance"` |
| Delete machine | `"Machine removed"` |
| Add material | `"Material added"` |
| Adjust material quantity | `"Stock updated"` |
| Delete material | `"Material removed"` |
| Invalid material quantity | `"Invalid quantity"` |
| Allocation time validation (client-side) | `"End time must be after start time"` |

---

## Test Scenarios by Page

### Login Page (`/login`)

- **Valid supervisor login** → URL changes to `/board`
- **Valid viewer login** → URL changes to `/board`
- **Wrong password** → API returns 401; error toast appears; user stays on `/login`
- **Empty fields** → inline error text `"Username and password are required"` appears below the form; no API call made
- **While submitting** → button text changes to `"Signing in…"` and is disabled

---

### Board Page (`/board`) — Supervisor

The board is the core screen. Test in this order:

**Initial state**
- Page loads without errors
- Work order columns are visible (non-COMPLETED orders only)
- Resource panel is visible on the left (supervisor only)
- Idle Operators count badge is visible (top-right)
- Idle Machines count badge is visible (top-right)

**Assign a resource to a work order (ResourcePanel click flow)**
1. In the Resource Panel (left), select a work order from the **"Assign to work order"** `<select>` dropdown
2. Locate an operator row showing `"AVAILABLE"` status chip
3. **Click** the operator row (highlights blue on hover)
4. Assert: a new AllocationCard appears in the correct work order column with the operator's name
5. Assert: the Idle Operators count decreases by 1
6. Assert: toast `"Resource assigned"` appears

**Filter operators by skill**
1. Use the "All skills" dropdown in the Operators section of the ResourcePanel
2. Select a specific skill
3. Assert: only operators tagged with that skill remain visible

**Assign a machine to a work order**
1. Select a work order from the dropdown in the ResourcePanel
2. Scroll to the Machines section; click an `"AVAILABLE"` machine row
3. Assert: AllocationCard appears in the column; Idle Machines count decreases by 1; toast `"Resource assigned"`

**Move an allocation between work orders (drag existing card)**
1. Locate an existing AllocationCard in any column
2. Drag it to a **different** work order column
3. Assert: card moves to the new column
4. Assert: toast `"Allocation moved"` appears

**AllocationCard shows "Unnamed allocation" when no resource**
- An allocation with no operator or machine shows italic gray text `"Unnamed allocation"`
- An allocation with materials shows `"{count} material(s)"` below the resource name

**Delete an allocation**
1. Locate an AllocationCard
2. Click the `"✕"` button (`title="Remove allocation"`, top-right of card)
3. Assert: card disappears immediately (no confirm dialog)
4. Assert: toast `"Allocation removed"` appears
5. Assert: if the card had an operator, Idle Operators count increases by 1

**Edit allocation time — invalid**
1. Click `[data-testid="allocation-card"] >> [title="Click to edit times"]` on any AllocationCard
2. Two `datetime-local` inputs appear plus "Save" and "Cancel" text buttons
3. Set end time to before start time; click "Save"
4. Assert: toast `"End time must be after start time"` — both inputs remain visible; card time display unchanged

**Edit allocation time — valid**
1. Click `[data-testid="allocation-card"] >> [title="Click to edit times"]`
2. Set a valid range (end after start); click "Save"
3. Assert: the `[title="Click to edit times"]` element updates to show the new times; inputs close

---

### Board Page (`/board`) — Viewer

- Page loads; work order columns are visible
- **No Resource Panel** (left sidebar is completely absent)
- AllocationCards are rendered but:
  - **No ✕ delete button** visible on any card — `button[title="Remove allocation"]` must not exist in the DOM
  - AllocationCard root element must **not** have the Tailwind class `cursor-grab` — verify via `browser_evaluate`: `document.querySelector('[data-testid="allocation-card"]')?.classList.contains('cursor-grab')` must return `false`
- Idle count badges (top-right) are still visible

---

### Work Orders Page (`/work-orders`) — Supervisor

**Create a work order**
1. Click **"+ New Work Order"**
2. Fill `name="orderNumber"` (unique), `name="title"`, `name="scheduledStart"` (datetime-local), `name="scheduledEnd"` (datetime-local, after start), `name="targetQty"` (positive integer)
3. Click **"Save"**
4. Assert: new row appears with status badge `PENDING`; toast `"Work order created"`

**Validation — empty fields**
1. Click "+ New Work Order"; click "Save" with empty form
2. Assert: inline error text `"All fields are required"` appears; no API call made

**Validation — end before start**
1. Set `scheduledEnd` earlier than `scheduledStart`; click "Save"
2. Assert: inline error text `"End must be after start"` appears

**Edit a work order**
1. Click **"Edit"** text link on any row
2. Change `name="title"`; click **"Save"**
3. Assert: toast `"Work order updated"`; updated title shows in the row

**Status transitions (only on this page — not on the board)**
> Transition links appear as text like `"→ IN_PROGRESS"` in the Actions column.
1. Find a `PENDING` work order — Actions shows `"→ IN_PROGRESS"`
2. Click `"→ IN_PROGRESS"` → badge changes to `IN_PROGRESS`; Actions now shows `"→ COMPLETED"` and `"→ ON_HOLD"`
3. Click `"→ ON_HOLD"` → badge changes to `ON_HOLD`; Actions shows `"→ IN_PROGRESS"`
4. Click `"→ IN_PROGRESS"` → badge returns to `IN_PROGRESS`
5. Click `"→ COMPLETED"` → badge changes to `COMPLETED`; no more transition links

**Delete a work order**
> The Delete button **only appears when status = COMPLETED**. It is absent for PENDING, IN_PROGRESS, and ON_HOLD orders.
1. Transition a work order to COMPLETED (see above)
2. Click **"Delete"** text link (red)
3. Assert: row disappears immediately (no confirm dialog); toast `"Work order deleted"`
4. Navigate to `/board` — assert the work order column is no longer present

---

### Resources Page (`/resources`) — Supervisor

**Tab navigation**
- Page shows two tab buttons: `"Operators"` and `"Machines"` (active tab has underline)

**Add an operator**
1. Ensure "Operators" tab is active; click **"+ Add Operator"**
2. Fill `name="employeeId"`, `name="name"`, `name="skills"` (comma-separated, optional)
3. Click **"Save"**
4. Assert: toast `"Operator added"`; new row appears in the Operators table

**Validation — empty required fields (operator)**
1. Click "Save" without filling Employee ID or Name
2. Assert: inline error text `"Employee ID and name are required"` appears

**Mark operator as ABSENT**
1. Find an operator with status `AVAILABLE`
2. Click **"Mark Absent"** text link (orange) in their row
3. Assert: toast `"Operator marked absent"`; status chip changes to `ABSENT` (gray); "Mark Absent" button disappears for that row
4. Navigate to `/board` — assert the operator does NOT appear as AVAILABLE in the Resource Panel

**Delete an operator**
1. Click **"Delete"** text link (red) in any operator row
2. Assert: row disappears immediately (no confirm dialog); toast `"Operator removed"`

**Add a machine**
1. Click the **"Machines"** tab; click **"+ Add Machine"**
2. Fill `name="machineCode"`, `name="name"`, `name="type"`; click **"Save"**
3. Assert: toast `"Machine added"`; new row appears in the Machines table

**Validation — empty required fields (machine)**
1. Click "Save" with any field empty
2. Assert: inline error text `"All fields are required"` appears

**Set machine to MAINTENANCE**
1. Find a machine with status `AVAILABLE`
2. Click **"Set Maintenance"** text link (orange) in their row
3. Assert: toast `"Machine set to maintenance"`; status chip changes to `MAINTENANCE` (red); "Set Maintenance" button disappears for that row
4. Navigate to `/board` — assert the machine is NOT shown in the Resource Panel

**Delete a machine**
1. Click **"Delete"** text link (red) in any machine row
2. Assert: row disappears immediately; toast `"Machine removed"`

---

### Materials Page (`/materials`) — Supervisor

**View stock**
- Table columns: SKU, Name, Unit, Qty on Hand, Actions
- Any material with `quantityOnHand ≤ 0` shows quantity in **red bold**

**Add a material**
1. Click **"+ Add Material"**
2. Fill `name="sku"`, `name="name"`, `name="unitOfMeasure"` (label "Unit"), `name="quantityOnHand"` (number)
3. Click **"Save"**
4. Assert: toast `"Material added"`; new row appears in the table

**Validation — empty fields**
1. Click "Save" with any field empty
2. Assert: inline error text `"All fields required"` appears

**Adjust quantity (inline editing — not a dialog)**
1. Click **"Adjust"** text link (blue) in any material row
2. Assert: Qty column switches to a number `<input>` (auto-focused); "Save" and "Cancel" text links appear
3. Enter a valid positive number; click **"Save"**
4. Assert: toast `"Stock updated"`; new quantity shows in the row

**Adjust quantity — invalid (negative)**
1. Click "Adjust"; enter a negative number; click "Save"
2. Assert: toast `"Invalid quantity"`; quantity in row is unchanged

**Delete a material**
1. Click **"Delete"** text link (red) in any material row
2. Assert: row disappears immediately (no confirm dialog); toast `"Material removed"`

**Insufficient stock guard (allocation path)**
- When a supervisor assigns resources and materials to a work order, if `quantityRequired > quantityOnHand` the API returns 409
- Assert: error toast containing `"INSUFFICIENT_STOCK"` appears; no AllocationCard is created

---

### Role guard — Viewer cannot mutate

Log in as `viewer`, then assert all of the following are **absent from the DOM**:

| Page | Element that must NOT be present |
|---|---|
| `/board` | Left ResourcePanel sidebar |
| `/board` | AllocationCard `✕` delete button |
| `/board` | `cursor: grab` style on AllocationCards |
| `/work-orders` | `"+ New Work Order"` button |
| `/work-orders` | `"→ STATUS"` transition links |
| `/work-orders` | `"Edit"` and `"Delete"` text links |
| `/resources` | `"+ Add Operator"` / `"+ Add Machine"` buttons |
| `/resources` | `"Mark Absent"` button |
| `/resources` | `"Set Maintenance"` button |
| `/resources` | `"Delete"` links in both tables |
| `/materials` | `"+ Add Material"` button |
| `/materials` | `"Adjust"` button |
| `/materials` | `"Delete"` link |

---

### Logout flow

1. Log in as supervisor; navigate to `/board`
2. Click the **"Logout"** text link in the top-right of the header
3. Assert: URL changes to `/login`
4. Assert: navigating directly to `/board` redirects back to `/login`

---

### Navigation links (MainLayout)

With any user logged in, assert each nav link routes correctly:

| Link text | Expected path |
|---|---|
| `"Board"` | `/board` |
| `"Work Orders"` | `/work-orders` |
| `"Resources"` | `/resources` |
| `"Materials"` | `/materials` |

Also assert the header displays the logged-in username and a role badge (`SUPERVISOR` or `VIEWER`).

---

## Conflict Detection Tests (run as Supervisor)

**Operator double-booking**
> Use the seed data pair: WO-001 and WO-002 share an overlapping time window. Assign **Alice Nguyen** (EMP-001) to WO-001, then immediately assign the same operator to WO-002.
1. In ResourcePanel, select `WO-001` from the work order dropdown; click Alice Nguyen's row → first AllocationCard created
2. Select `WO-002` from the dropdown; click Alice Nguyen's row again
3. Assert: error toast containing `"OPERATOR_CONFLICT"`; no second AllocationCard appears in WO-002's column

**Machine double-booking**
> Same pattern: assign **Welding Robot Arm 1** (MCH-001) to WO-001, then attempt to assign it to WO-002.
1. Assign MCH-001 to WO-001 → AllocationCard created
2. Select WO-002; click MCH-001 row again
3. Assert: error toast containing `"MACHINE_CONFLICT"`; no second card created

**Material over-allocation**
> There is no UI on the board to attach materials to an allocation. Test this scenario via the API directly (not via the Playwright UI):
```
POST /api/allocations  { workOrderId, operatorId, startTime, endTime, materials: [{ materialId, quantityRequired: <full stock> }] }
POST /api/allocations  { same materialId, quantityRequired: 1 }  → expect 409
```
If you want a UI-only test suite, skip this scenario and rely on the backend Jest tests for stock validation.

---

## Assertions Checklist

Apply after every mutating action:

- [ ] Toast message appears with the **exact text** from the toast table above, then fades out
- [ ] The relevant list/board reflects the change immediately (optimistic update)
- [ ] No full-page error, blank screen, or ErrorBoundary `"Something went wrong"` message is visible
- [ ] On API error: the board/list rolls back to its pre-action state (optimistic rollback)

---

## Selector Reference

```
Login username:              input[name="username"]
Login password:              input[name="password"]
Login submit:                button >> text="Sign In"
Login loading state:         button >> text="Signing in…"
Work order columns:          [data-testid="work-order-column"]   ← add testid first
Work order row (table):      [data-testid="work-order-row"]      ← add testid first
Allocation card:             [data-testid="allocation-card"]     ← add testid first
Allocation delete button:    button[title="Remove allocation"]
Allocation time display:     element containing " – " inside an allocation card
ResourcePanel WO select:     select  (label "Assign to work order")
ResourcePanel skill filter:  select  (label or value "All skills")
Operator row (panel):        [data-testid="resource-operator"]   ← add testid first
Machine row (panel):         [data-testid="resource-machine"]    ← add testid first
Idle operators badge:        [data-testid="idle-operators"]      ← add testid first
Idle machines badge:         [data-testid="idle-machines"]       ← add testid first
Operator table row:          [data-testid="operator-row"]        ← add testid first
Machine table row:           [data-testid="machine-row"]         ← add testid first
Material table row:          [data-testid="material-row"]        ← add testid first
Status transition links:     button >> text=/^→/
Resources tab buttons:       button >> text="Operators" / button >> text="Machines"
Toast (react-hot-toast):     div[role="status"]
```

---

## Required `data-testid` Attributes

**Zero `data-testid` attributes exist in the codebase.** Add these before writing selectors that depend on them:

| File | Element | `data-testid` value |
|---|---|---|
| `AllocationBoard/WorkOrderColumn.tsx` | root wrapper `div` | `work-order-column` |
| `AllocationBoard/AllocationCard.tsx` | root wrapper `div` | `allocation-card` |
| `AllocationBoard/ResourcePanel.tsx` | each operator `div` row | `resource-operator` |
| `AllocationBoard/ResourcePanel.tsx` | each machine `div` row | `resource-machine` |
| `AllocationBoard/index.tsx` | idle operators `<span>` | `idle-operators` |
| `AllocationBoard/index.tsx` | idle machines `<span>` | `idle-machines` |
| `WorkOrders/index.tsx` | each work order table `<tr>` | `work-order-row` |
| `Resources/index.tsx` | each operator table `<tr>` | `operator-row` |
| `Resources/index.tsx` | each machine table `<tr>` | `machine-row` |
| `Materials/index.tsx` | each material table `<tr>` | `material-row` |

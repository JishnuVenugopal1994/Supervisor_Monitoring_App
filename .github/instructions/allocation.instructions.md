---
description: "Use when working on allocation logic, conflict detection, the AllocationBoard component, AllocationCard, drag-and-drop assignment, or allocationService. Core domain rules for double-booking prevention and material reservation."
applyTo: ["backend/src/services/allocationService*", "backend/src/controllers/allocationController*", "backend/src/routes/allocations*", "frontend/src/components/AllocationBoard/**", "frontend/src/components/AllocationCard/**", "frontend/src/store/allocationStore*"]
---

# Allocation Domain Rules

## ConflictError — Typed Error Class
Define this in `backend/src/errors/ConflictError.ts` and use it throughout `allocationService`:
```ts
export class ConflictError extends Error {
  constructor(
    public code: 'OPERATOR_CONFLICT' | 'MACHINE_CONFLICT' | 'INSUFFICIENT_STOCK',
    public conflicts: unknown[]
  ) {
    super(code);
    this.name = 'ConflictError';
  }
}
```
The global `errorHandler` must catch `ConflictError` and map it to HTTP 409:
```ts
if (err instanceof ConflictError) {
  return res.status(409).json({ error: err.message, code: err.code, conflicts: err.conflicts });
}
```

## Conflict Detection (Backend — allocationService)
These checks must run on every create AND update. Never skip them on update.

### Operator Overlap Check
```ts
const conflict = await tx.allocation.findFirst({
  where: {
    operatorId,
    id: { not: excludeId },   // exclude current record on update
    startTime: { lt: endTime },
    endTime: { gt: startTime },
  },
});
if (conflict) throw new ConflictError('OPERATOR_CONFLICT', [conflict]);
```

### Machine Overlap Check
Same pattern as operator, using `machineId`.

### Material Stock Check
```ts
const material = await tx.material.findUniqueOrThrow({ where: { id: materialId } });
if (material.quantityOnHand < quantityRequired) {
  throw new ConflictError('INSUFFICIENT_STOCK', [{ materialId, available: material.quantityOnHand }]);
}
```

## Transaction Requirement
All three checks + the write must be inside a single Prisma interactive transaction:
```ts
return prisma.$transaction(async (tx) => {
  await checkOperatorConflict(tx, ...);
  await checkMachineConflict(tx, ...);
  await checkMaterialStock(tx, ...);
  // Decrement material quantity on create
  for (const mat of materials) {
    await tx.material.update({
      where: { id: mat.materialId },
      data: { quantityOnHand: { decrement: mat.quantityRequired } },
    });
  }
  // Update resource statuses
  if (operatorId) await tx.operator.update({ where: { id: operatorId }, data: { status: 'ASSIGNED' } });
  if (machineId) await tx.machine.update({ where: { id: machineId }, data: { status: 'RUNNING' } });
  return tx.allocation.create({ data: { ... }, include: { materials: true } });
});
```

## Delete / Undo Allocation
When deleting an allocation, restore material quantity and reset resource statuses in the same transaction:
```ts
return prisma.$transaction(async (tx) => {
  const alloc = await tx.allocation.findUniqueOrThrow({ where: { id }, include: { materials: true } });
  for (const am of alloc.materials) {
    await tx.material.update({
      where: { id: am.materialId },
      data: { quantityOnHand: { increment: am.quantityRequired } },
    });
  }
  // Reset resource statuses only if no other active allocations remain
  if (alloc.operatorId) {
    const otherActive = await tx.allocation.count({
      where: { operatorId: alloc.operatorId, id: { not: id }, endTime: { gt: new Date() } },
    });
    if (otherActive === 0) {
      await tx.operator.update({ where: { id: alloc.operatorId }, data: { status: 'AVAILABLE' } });
    }
  }
  if (alloc.machineId) {
    const otherActive = await tx.allocation.count({
      where: { machineId: alloc.machineId, id: { not: id }, endTime: { gt: new Date() } },
    });
    if (otherActive === 0) {
      await tx.machine.update({ where: { id: alloc.machineId }, data: { status: 'AVAILABLE' } });
    }
  }
  await tx.allocation.delete({ where: { id } });
});
```

## Updating an Allocation (PATCH)
When time window or resources change, ALL conflict checks must re-run excluding the current record:
- Pass `excludeId: string` to each check function (already shown in operator overlap check above)
- If `operatorId` changes, check the NEW operator — not the old one
- If `machineId` changes, check the NEW machine
- If material quantities change: restore old `quantityRequired`, then re-check and reserve new amount — all in one transaction

## HTTP Response for Conflicts
Return 409 with a structured conflicts array — never 500:
```ts
res.status(409).json({
  error: 'Operator is already allocated during this time window',
  code: 'OPERATOR_CONFLICT',
  conflicts: [{ allocationId, startTime, endTime }],
});
```

## AllocationBoard UI Rules

### Board Layout
- Board columns = Work Orders grouped by status (PENDING | IN_PROGRESS | ON_HOLD). COMPLETED work orders are hidden from the board (visible only on the Work Orders list page).
- Resource panel (right side) = Operator cards + Machine cards filtered to AVAILABLE status
- Only SUPERVISOR role sees drag handles; VIEWER sees the board read-only (no drag, no delete buttons)

### Two Drag Interactions (both handled by allocationService on the backend)

**1. New assignment** — drag a resource card FROM the resource panel TO a work order column:
- Creates a new allocation: calls `POST /api/allocations`
- The dragged resource card stays in the panel (a copy goes to the column); it disappears from the panel once its status flips to ASSIGNED/RUNNING via Socket.IO event

**2. Re-assignment** — drag an existing allocation card FROM one work order column TO another:
- Moves the allocation: calls `PATCH /api/allocations/:id` with the new `workOrderId`
- This is the "adjust on the fly" path — supervisors can redirect a resource mid-shift without deleting and recreating
- Runs the same conflict checks as a new create (excluding self), but for the NEW work order's time window
- Optimistic update: move the card visually, rollback to source column on error

**3. Removing an assignment** — SUPERVISOR clicks the delete (✕) button on an existing allocation card:
- Calls `DELETE /api/allocations/:id`
- The delete button is only rendered for SUPERVISOR role — never shown to VIEWER
- On delete: allocation is removed, material quantities are restored, and resource statuses are reset if no other active allocations remain
- Optimistic update: remove the card immediately, restore it on API error
- Toast: `'Resource unassigned'` on success, error message on failure

**4. Editing the time window** — SUPERVISOR clicks start/end time fields on an allocation card:
- Inline time pickers appear on the card for `startTime` and `endTime`
- On change, calls `PATCH /api/allocations/:id` with the new time window
- Conflict checks re-run server-side; if a conflict is detected the card turns red and the time reverts

### Idle Time Visibility (Core Requirement)
The board must make idle/unassigned resources immediately visible:
- **Resource panel badge**: each resource card shows status chip (`AVAILABLE` = green, `ASSIGNED/RUNNING` = blue, `ABSENT/MAINTENANCE` = grey)
- **Work order column badge**: each column header shows `X operators / Y machines` currently assigned to it
- **Unassigned work order indicator**: work order columns with zero allocations show a yellow warning banner: "No resources assigned"
- **Header summary bar**: shows total counts — `Idle Operators: N | Idle Machines: N` where idle = AVAILABLE status
- Supervisor's goal is to reduce idle counts on the header bar and eliminate yellow banners on work order columns

### Resource Panel Filtering
- Filter by resource type: toggle between Operators / Machines / Both
- Filter operators by skill tag: clicking a skill chip filters to operators who have that skill in their `skills[]` array
- Filter is purely client-side — no extra API call; filter against `resourceStore.operators` already in memory

### `GET /api/allocations` Query Parameters
```
GET /api/allocations                           ← all allocations (board initial load)
GET /api/allocations?workOrderId=<id>          ← allocations for a specific work order
GET /api/allocations?from=<ISO>&to=<ISO>       ← allocations overlapping a time window
GET /api/allocations?workOrderId=<id>&from=<ISO>&to=<ISO>
```
The board fetches all allocations on mount (no date filter). The allocation includes `workOrderId` so the board can group cards into the correct column without additional queries.

## AllocationCard Visual States
| State | Tailwind classes | When |
|---|---|---|
| Normal | `bg-white border border-gray-200` | Assigned, no issues |
| Assigned (blue) | `bg-blue-50 border border-blue-400 text-blue-700` | Operator is ASSIGNED / Machine is RUNNING |
| Conflict | `bg-red-50 border border-red-400 text-red-700` | Time conflict or stock error |
| Pending (optimistic) | `opacity-60 animate-pulse` | Waiting for API response |
| Active/Running | `bg-green-50 border border-green-400` | Allocation is within its active time window right now |

The delete (✕) button on each card: visible and clickable only when `isSupervisor === true`. Position it top-right of the card.

## Socket.IO — Real-time Sync
After any allocation mutation succeeds, the backend emits:
- `allocation:created` → frontend calls `addAllocation(payload)`
- `allocation:updated` → frontend calls `updateAllocation(id, payload)`
- `allocation:deleted` → frontend calls `removeAllocation(id)`

The `useSocket` hook handles all three and dispatches to `allocationStore`.
Never poll for allocation state — rely on Socket.IO + initial HTTP fetch only.

# Shop Floor Resource Allocation — Product Requirements

## What Problem Are We Solving?

Manufacturing supervisors currently juggle multiple spreadsheets, whiteboards, or verbal agreements to decide who works on what, which machines are available, and whether materials are on hand. When something changes mid-shift — a machine breaks down, an operator calls in sick, a priority order comes in — the supervisor has to manually track all of this, often after the fact. The result is idle workers, underused machines, and work orders that slip behind schedule.

This system gives supervisors a single live view of their shop floor so they can assign and re-arrange resources instantly, with confidence that what they see is accurate right now.

---

## Who Uses This System?

### Supervisor

The primary user. Responsible for running the shop floor efficiently. Needs to know at a glance which work orders need resources, which operators and machines are free, and whether materials are available. Needs to be able to move things around quickly when plans change.

### Viewer (Read-Only)

A manager, planner, or other stakeholder who needs to see what is happening on the shop floor without being able to change anything. Could be watching from a different screen or office.

---

## What Does the System Do?

### 1. The Allocation Board — The Main Screen

The central screen is a visual board showing all active work orders as columns. Each column represents one work order. Inside each column, you can see which operators and machines are currently assigned to it.

On the right side of the screen is a panel listing all available operators and machines — the ones who are free to be assigned.

**Assigning a resource:** The supervisor drags an operator or machine from the right-hand panel and drops it onto a work order column. The system immediately checks whether that person or machine is free during that time window. If they are, the assignment is confirmed and all other supervisors watching the board see the update instantly. If there is a conflict, the card turns red and shows why — the supervisor can adjust the time or choose a different resource.

**Adjusting an assignment:** If plans change mid-shift, the supervisor can drag an existing assignment from one work order column to another. The resource moves to the new work order. This is the core "adjust on the fly" capability.

**Removing an assignment:** The supervisor can remove a resource from a work order. Any reserved materials are automatically returned to stock.

### 2. Spotting Idle Resources — Minimising Downtime

The board is designed to make idle time obvious:

- Each operator and machine card shows a colour badge — **green** means available, **blue** means already assigned, **grey** means absent or under maintenance.
- The top of the screen shows a live count: **Idle Operators: N | Idle Machines: N**. The supervisor's goal is to drive these numbers down.
- Any work order column with no resources assigned shows a **yellow warning banner** so the supervisor can see at a glance where attention is needed.

### 3. Work Orders

The supervisor can create and manage work orders — the jobs that need to be done. Each work order has:

- A reference number and title
- Scheduled start and end dates
- A target quantity
- A status that moves through a defined lifecycle

**Work order lifecycle:**

```
Not Started → In Progress → Completed
                         ↘ On Hold → In Progress (again)
```

A completed work order cannot be re-opened.

The Work Orders page lists all work orders with their current status. Supervisors can create new ones, edit existing ones, and change status. Viewers can see the list but cannot make changes.

### 4. Operators

The Operators section manages the people on the floor. Each operator has:

- A name and employee ID
- A set of skill tags (e.g. "Welding", "Assembly") used to filter the resource panel
- A status: Available, Assigned, or Absent

**Statuses:**

- **Available** — the operator is on shift and free to be assigned
- **Assigned** — set automatically when the operator is allocated to a work order
- **Absent** — set manually by the supervisor when someone calls in sick or takes leave

When an operator has no more active assignments, the system automatically returns them to Available.

Supervisors can add new operators, edit details, and mark operators as Absent. Viewers can see the list.

### 5. Machines

The Machines section mirrors the Operators section but for equipment. Each machine has:

- A name and a machine code
- A type (e.g. "CNC Lathe", "Press")
- A status: Available, Running, or Under Maintenance

**Statuses:**

- **Available** — machine is operational and free
- **Running** — set automatically when allocated to a work order
- **Under Maintenance** — set manually by the supervisor

When a machine has no more active assignments, it returns to Available automatically.

Supervisors can add machines, edit details, and mark them for maintenance. Viewers can see the list.

### 6. Materials

The Materials section tracks stock on hand. Each material has:

- A name and SKU code
- A unit of measure (e.g. kg, units, metres)
- A quantity on hand (the actual physical stock)

When a supervisor assigns materials to an allocation, the quantity is reserved (deducted from stock). If the work order is cancelled or the allocation is removed, the reserved quantity is automatically returned to stock.

The system prevents over-reservation — if you try to allocate more than what is on hand, the system rejects it immediately and tells you how much is available.

Supervisors can adjust stock quantities. Viewers can see current stock levels.

### 7. Real-Time Collaboration

All connected supervisors and viewers see the board update live. If one supervisor moves a resource, everyone else's screen updates within seconds — no manual refresh needed. This means a supervisor at a desk and a manager watching from another screen always see the same current picture.

### 8. Login and Access Control

Every user logs in with a username and password. Sessions are secure and time-limited. Two access levels:

| What you can do                 | Supervisor | Viewer |
| ------------------------------- | ---------- | ------ |
| See the allocation board        | ✅         | ✅     |
| Drag and assign resources       | ✅         | ❌     |
| Create / edit work orders       | ✅         | ❌     |
| Add / edit operators & machines | ✅         | ❌     |
| Adjust material stock           | ✅         | ❌     |
| View all data                   | ✅         | ✅     |

---

## Rules the System Always Enforces

These are non-negotiable — the system will never allow them to be broken:

1. **An operator cannot be in two places at once.** If you try to assign an operator to a work order during a time window when they are already assigned elsewhere, the system rejects it and tells you which allocation conflicts.

2. **A machine cannot run two jobs simultaneously.** Same rule as above for machines.

3. **You cannot reserve materials you don't have.** If stock on hand is 50 kg and you try to allocate 60 kg, the system rejects it immediately and shows the available quantity.

4. **A completed work order is final.** Its status cannot be changed.

---

## What the System Does NOT Do (MVP Scope)

To keep the initial version focused and deliverable, the following are intentionally out of scope:

- No shift templates or recurring schedule patterns
- No cost tracking, labour rates, or budget views
- No integration with ERP or MES systems (SAP, Oracle, etc.)
- No mobile app — designed for desktop browsers
- No email or SMS notifications
- No reporting dashboards or historical analytics charts

These may be added in future phases based on how the MVP performs.

---

## What "Done" Looks Like

The system is working correctly when a supervisor can:

1. Log in and see the live allocation board
2. Spot which work orders have no resources assigned (yellow warning banner)
3. See how many operators and machines are currently idle (header count)
4. Drag an available operator from the panel onto a work order — the assignment appears immediately on all connected screens
5. Try to assign an operator who is already booked — receive a clear conflict message, not a system error
6. Drag an allocation from one work order to another to redirect the resource mid-shift
7. Remove an allocation and see the material stock restored to the correct quantity
8. Open the system in a second browser window as a Viewer and see all changes live, with no ability to drag or edit

A second supervisor logged in at the same time sees all board changes in real time without refreshing.

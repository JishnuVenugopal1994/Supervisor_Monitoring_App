---
description: "Use when writing Prisma schema changes, creating database migrations, modifying models, or seeding the database. Covers naming conventions, relation patterns, migration safety, and transaction rules."
applyTo: ["**/*.prisma", "**/migrations/**", "**/seed.ts"]
---

# Prisma & Database Conventions

## Schema Naming
- Model names: PascalCase singular (`WorkOrder`, `Allocation`)
- Field names: camelCase (`orderNumber`, `scheduledStart`)
- Enum names: PascalCase (`WorkOrderStatus`, `OperatorStatus`)
- Enum values: SCREAMING_SNAKE_CASE (`IN_PROGRESS`, `ON_HOLD`)
- Relation fields: camelCase, named after the related model (`workOrder`, `allocations`)
- Foreign key fields: `<relationName>Id` pattern (`workOrderId`, `operatorId`)

## Relation Rules
- Always define both sides of a relation (implicit back-relations are allowed only for M-M via join table)
- Use explicit join models (not `@relation` implicit M-M) when the join has extra fields — e.g., `AllocationMaterial` has `quantityRequired`
- Use `onDelete: Cascade` for child records that have no meaning without the parent (e.g., `AllocationMaterial` → `Allocation`)
- Use `onDelete: Restrict` (default) for records that should block deletion if referenced (e.g., `Operator` referenced by `Allocation`)

## Migration Safety
- Never drop a column in the same migration that removes the application code referencing it — split into two releases
- Always provide `@default(...)` when adding a non-nullable column to an existing table
- Test rollback of every migration in development before committing
- Use descriptive migration names: `npx prisma migrate dev --name add_allocation_material_table`
- Never edit migration files after they've been committed and run

## Transactions
- Use `prisma.$transaction(async (tx) => { ... })` (interactive form) for any conditional logic — checks then writes
- Use `prisma.$transaction([op1, op2])` (array form) only for independent, non-conditional operations that can run in parallel
- Always pass the `tx` client (not the global `prisma`) inside a transaction callback

## Performance Indexes
Add `@@index` on fields used in conflict-detection queries — these run on every allocation create/update:
```prisma
model Allocation {
  // ... fields
  @@index([operatorId, startTime, endTime])
  @@index([machineId, startTime, endTime])
}
```
Also index foreign keys that are used in frequent `WHERE` filters.

## Array Fields
Prisma with PostgreSQL supports `String[]` for scalar arrays. Use this for `Operator.skills`:
```prisma
model Operator {
  skills String[]
}
```
Do NOT use a separate `OperatorSkill` join table for a simple string tag list.

## After Any Schema Change
Always run both steps in order:
1. `npx prisma migrate dev --name <name>` — creates and applies migration, auto-runs `prisma generate`
2. Verify TypeScript picks up new types: check that `@prisma/client` imports compile without errors

If only regenerating types without a schema change (e.g., after a `git pull`):
```bash
npx prisma generate
```

## Seed Script (`prisma/seed.ts`)
- Use `upsert` (not `create`) so the seed is idempotent and safe to re-run
- Seed data must satisfy all domain constraints:
  - Operators seeded as ASSIGNED must have a matching active Allocation
  - Machines seeded as RUNNING must have a matching active Allocation
  - Materials seeded with allocations must have `quantityOnHand` already reduced by the sum of all `quantityRequired` across active AllocationMaterial records — the seed must reflect the post-reservation state, not the gross stock
  - Operators/Machines seeded as AVAILABLE must have no active (non-expired) Allocations
- Keep seed data within the size limits: ≤20 work orders, ≤15 operators, ≤10 machines, ≤30 materials

## Availability Query Pattern
When checking if an operator/machine is free in a time window, use:
```ts
// Overlapping windows: existing.start < requested.end AND existing.end > requested.start
where: {
  operatorId,
  startTime: { lt: endTime },
  endTime: { gt: startTime },
}
```

---
description: "Safely add a new Prisma model or field: schema edit, migration command, seed update, and application code checklist. Use when adding entities or columns to the database."
argument-hint: "What to add (e.g. 'Add ShiftTemplate model' or 'Add priority field to WorkOrder')"
agent: "agent"
---

Add the following to the Prisma schema: **{{input}}**

Follow these steps in order:

1. **Read `backend/prisma/schema.prisma`** to understand the current schema before making any changes.

2. **Edit `schema.prisma`**
   - Apply naming conventions: PascalCase models, camelCase fields, SCREAMING_SNAKE_CASE enum values
   - For new models: add `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
   - For new non-nullable columns on existing models: always add `@default(...)` or make the field optional (`?`) to avoid breaking the existing migration history
   - Define both sides of any new relation
   - Use `onDelete: Cascade` for child records; `onDelete: Restrict` for referenced master records

3. **Generate and name the migration**
   - Run: `cd backend && npx prisma migrate dev --name <descriptive_name>`
   - Use snake_case for migration names (e.g., `add_shift_template_model`, `add_priority_to_work_order`)
   - Do NOT edit the generated migration SQL file

4. **Update `backend/prisma/seed.ts`**
   - Add seed entries for any new required model using `upsert` (not `create`) so it's idempotent
   - If a new required field was added to an existing model, update existing seed entries to include it

5. **Check application code**
   - Search for any TypeScript types, interfaces, or Zod schemas that manually mirror the changed model — update them to match
   - If a new model was added, note which service file (`src/services/`) should be created to handle its CRUD operations

6. **Validate**
   - Run `cd backend && npx prisma generate` to confirm TypeScript types are updated
   - Run `cd backend && npx prisma db seed` to confirm seed still runs cleanly

Reference `backend/prisma/schema.prisma` and `backend/prisma/seed.ts` for current patterns.

---
description: "Scaffold a new API route with controller, service, and router registration following project conventions. Generates the full vertical slice for a new domain resource."
argument-hint: "Resource name (e.g. 'WorkOrder', 'Operator')"
agent: "agent"
---

Generate a new backend API route for the resource: **{{input}}**

Follow these steps exactly:

1. **Create `backend/src/routes/{{input | camelCase}}s.ts`**
   - GET `/` — list (authMiddleware only)
   - GET `/:id` — get by id (authMiddleware only)
   - POST `/` — create (authMiddleware + roleGuard('SUPERVISOR'))
   - PATCH `/:id` — update (authMiddleware + roleGuard('SUPERVISOR'))
   - DELETE `/:id` — delete (authMiddleware + roleGuard('SUPERVISOR'))

2. **Create `backend/src/controllers/{{input | camelCase}}Controller.ts`**
   - Thin controller functions: parse request → call service → return response
   - No business logic, no direct Prisma calls
   - Use the standard error response shape: `{ error: string, code?: string }`
   - Successful create returns 201, successful delete returns 204

3. **Create `backend/src/services/{{input | camelCase}}Service.ts`**
   - `list(filters?)`, `getById(id)`, `create(data)`, `update(id, data)`, `remove(id)`
   - Use Prisma for all DB operations
   - Throw descriptive errors with a message string on not-found, validation failures

4. **Register the router in `backend/src/app.ts`** (or wherever routes are mounted):
   - Add: `app.use('/api/{{input | camelCase}}s', {{input | camelCase}}Router);`

5. **Check for any new Prisma model** needed for this resource. If the model doesn't exist in `schema.prisma`, note what fields are needed but do NOT modify the schema — describe what migration is required.

Reference `backend/src/routes/` for existing route files to match the pattern exactly.

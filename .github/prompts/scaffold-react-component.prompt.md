---
description: "Scaffold a new React component with TypeScript, Tailwind styling, and Zustand store wiring. Generates component folder, index.tsx, types, and optionally a store slice."
argument-hint: "Component name (e.g. 'AllocationCard', 'WorkOrderColumn')"
agent: "agent"
---

Generate a new React component: **{{input}}**

Follow these steps exactly:

1. **Create `frontend/src/components/{{input}}/index.tsx`**
   - Functional component with TypeScript props interface
   - Use Tailwind utility classes only — no inline styles, no CSS modules
   - Export the component as the default export
   - If the component displays data from a Zustand store, import from the correct domain store (`allocationStore`, `workOrderStore`, or `resourceStore`)
   - If the component triggers mutations, call the API via `src/services/api.ts` and apply optimistic updates with rollback

2. **Create `frontend/src/components/{{input}}/types.ts`** (only if props are non-trivial)
   - Export the props interface and any component-local types

3. **Determine if a new Zustand store slice is needed**
   - If yes, update (do not replace) the relevant store file in `frontend/src/store/`
   - Add only the fields and actions this component needs
   - Follow the existing store pattern: `set(state => ({ ... }))` updates

4. **If the component reacts to real-time events**, describe which Socket.IO events it needs. The `useSocket` hook in `frontend/src/hooks/useSocket.ts` already handles dispatching — check that the relevant event is handled there; if not, note what needs to be added.

5. **Export the component** from `frontend/src/components/index.ts` if that barrel file exists.

Reference `frontend/src/components/` for existing components to match the folder and naming pattern.

---
description: "Add a new Socket.IO event end-to-end: backend emitter in the correct controller, frontend handler in useSocket hook, and Zustand store dispatch. Use when wiring real-time updates for a new event type."
argument-hint: "Event name (e.g. 'workOrder:statusChanged', 'resource:statusChanged')"
agent: "agent"
---

Add a new Socket.IO event: **{{input}}**

Follow these steps exactly:

1. **Backend — emit the event from the correct controller**
   - Identify which controller action triggers this event (create, update, delete, or status change)
   - After the successful DB write (not inside the service), add:
     ```ts
     io.to('shop-floor').emit('{{input}}', payload);
     ```
   - The `io` instance must be imported from the Socket.IO setup file (e.g., `src/socket/index.ts`), not re-created
   - Emit only on success — never before the DB write completes

2. **Backend — define the event payload type** in `backend/src/socket/events.ts` (create if it doesn't exist):
   ```ts
   export interface {{input | PascalCase}}Event {
     // fields that the frontend needs to update its state
   }
   ```

3. **Frontend — handle the event in `frontend/src/hooks/useSocket.ts`**
   - Add a listener for `'{{input}}'` inside the existing `useEffect` where other listeners are registered
   - Dispatch to the correct Zustand store action:
     ```ts
     socket.on('{{input}}', (payload) => {
       useXxxStore.getState().updateXxx(payload);
     });
     ```
   - Remove the listener in the cleanup function: `socket.off('{{input}}');`

4. **Frontend — ensure the Zustand store action exists**
   - If the dispatch target action doesn't exist in the store, add it
   - Follow the existing store action pattern

5. **Verify no duplicate listeners** — check that this event name isn't already handled in `useSocket.ts` before adding.

Reference `frontend/src/hooks/useSocket.ts` and `backend/src/socket/` for existing patterns.

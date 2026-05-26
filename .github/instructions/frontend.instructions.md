---
description: "Use when writing React components, hooks, Zustand stores, or API service calls in the frontend. Covers component structure, state management patterns, Tailwind usage, and axios interceptor setup."
applyTo: "frontend/src/**/*.{ts,tsx}"
---

# Frontend Conventions

## Shared TypeScript Types
Frontend types mirror the Prisma models. They live in `src/types/index.ts` and are maintained manually (no codegen for MVP):
```ts
// src/types/index.ts
export type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
export type OperatorStatus = 'AVAILABLE' | 'ASSIGNED' | 'ABSENT';
export type MachineStatus = 'AVAILABLE' | 'RUNNING' | 'MAINTENANCE';
export type Role = 'SUPERVISOR' | 'VIEWER';

export interface WorkOrder {
  id: string; orderNumber: string; title: string; status: WorkOrderStatus;
  scheduledStart: string; scheduledEnd: string; targetQty: number;
}
export interface Operator {
  id: string; name: string; employeeId: string; skills: string[]; status: OperatorStatus;
}
export interface Machine {
  id: string; name: string; machineCode: string; type: string; status: MachineStatus;
}
export interface Material {
  id: string; name: string; sku: string; unitOfMeasure: string; quantityOnHand: number;
}
export interface Allocation {
  id: string; workOrderId: string; operatorId: string | null; machineId: string | null;
  startTime: string; endTime: string; createdBy: string;
  operator?: Operator; machine?: Machine; materials?: AllocationMaterial[];
}
export interface AllocationMaterial {
  materialId: string; quantityRequired: number; material?: Material;
}
```
All API responses are typed against these interfaces. If the Prisma schema changes, update `src/types/index.ts` to match.

## VIEWER Role — Conditional Rendering
Hide all mutation controls based on role. Use a helper to keep components clean:
```ts
// src/hooks/useAuth.ts — expose isSupervisor
const isSupervisor = user?.role === 'SUPERVISOR';
```
In components:
```tsx
{isSupervisor && <button>Create Work Order</button>}
{isSupervisor && <DragHandle />}   {/* never render for VIEWER */}
{isSupervisor && <DeleteButton />}
```
VIEWER sees the board, all lists, and all data — they just have no controls to mutate anything. Never show a disabled button to VIEWER — simply omit it.

## Component Folder Structure
Each component lives in its own folder:
```
src/components/AllocationBoard/
  index.tsx          ← default export
  types.ts           ← component-local types (if needed)
  AllocationCard.tsx ← sub-components co-located here
```
No flat single-file components at the top of `components/` — always use folders.

## Zustand Stores — One Per Domain
```ts
// ✅ Correct — domain-scoped stores
import { useAllocationStore } from '../store/allocationStore';
import { useWorkOrderStore } from '../store/workOrderStore';
import { useResourceStore } from '../store/resourceStore';

// ❌ Wrong — single monolithic store
import { useAppStore } from '../store/appStore';
```

Store shape pattern — all three stores follow this same structure:
```ts
// allocationStore.ts
interface AllocationStore {
  allocations: Allocation[];
  isLoading: boolean;
  setAllocations: (items: Allocation[]) => void;
  addAllocation: (item: Allocation) => void;
  updateAllocation: (id: string, patch: Partial<Allocation>) => void;
  removeAllocation: (id: string) => void;
}

// workOrderStore.ts
interface WorkOrderStore {
  workOrders: WorkOrder[];
  isLoading: boolean;
  setWorkOrders: (items: WorkOrder[]) => void;
  addWorkOrder: (item: WorkOrder) => void;
  updateWorkOrder: (id: string, patch: Partial<WorkOrder>) => void;
  removeWorkOrder: (id: string) => void;
}

// resourceStore.ts  
interface ResourceStore {
  operators: Operator[];
  machines: Machine[];
  materials: Material[];
  isLoading: boolean;
  setOperators: (items: Operator[]) => void;
  setMachines: (items: Machine[]) => void;
  setMaterials: (items: Material[]) => void;
  updateOperator: (id: string, patch: Partial<Operator>) => void;
  updateMachine: (id: string, patch: Partial<Machine>) => void;
  updateMaterial: (id: string, patch: Partial<Material>) => void; // for stock adjustments
}
```

## Optimistic Updates (Drag-and-Drop)
Apply the update to the local store immediately, then call the API.
On error, rollback to the previous state:
```ts
const prev = useAllocationStore.getState().allocations;
addAllocation(optimistic);         // immediate UI update
try {
  const created = await api.createAllocation(payload);
  updateAllocation(optimistic.id, created); // reconcile with server response
} catch {
  setAllocations(prev);            // rollback
  toast.error('Failed to assign — allocation rolled back');
}
```

## API Client (axios)
All API calls go through `src/services/api.ts`. Configure it with `VITE_API_URL`:
```ts
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL, withCredentials: true });
```
Use interceptors for:
- Attaching the access token from memory to every request's `Authorization: Bearer <token>` header
- Calling `POST /api/auth/refresh` on 401, retrying the original request once
- Guard against infinite retry loops using a flag on the failed request config:
```ts
api.interceptors.response.use(null, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && !original._retry) {
    original._retry = true;
    const { data } = await api.post('/api/auth/refresh');
    setAccessToken(data.accessToken);
    original.headers['Authorization'] = `Bearer ${data.accessToken}`;
    return api(original);
  }
  return Promise.reject(error);
});
```
Never store the access token in `localStorage` or `sessionStorage` — keep in a module-level variable.

## Auth Token Rules
```ts
// ✅ Memory only
let accessToken: string | null = null;
export const setAccessToken = (t: string) => { accessToken = t; };

// ❌ Never
localStorage.setItem('token', jwt);
```

## Tailwind Rules
- Tailwind utility classes only — no CSS modules, no `style={{}}` inline styles
- Responsive prefix order: `sm:` → `md:` → `lg:` → `xl:`
- Use `clsx` or `cn()` helper for conditional class merging — never string template literals for conditionals
- Color tokens: use semantic Tailwind classes (`bg-red-100 text-red-700`) for conflict states, `bg-green-100 text-green-700` for available

## useAuth Hook
`src/hooks/useAuth.ts` is the single source of auth state:
```ts
interface AuthState {
  user: { id: string; username: string; role: 'SUPERVISOR' | 'VIEWER' } | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}
```
- `login` calls `POST /api/auth/login`, stores the returned access token via `setAccessToken()`, sets user in Zustand auth store
- `logout` calls `POST /api/auth/logout`, clears token and user state
- Components use `useAuth().user.role` to conditionally render SUPERVISOR-only controls (drag handles, delete buttons)

## User Feedback (Toasts)
Use `react-hot-toast` (or equivalent) for success/error feedback on mutations:
```ts
import toast from 'react-hot-toast';

// On success
toast.success('Operator assigned');

// On API error
try { ... } catch (err) {
  toast.error(getErrorMessage(err)); // extract error.response.data.error
  setAllocations(prev); // rollback
}
```
Never use `alert()` or `console.error()` as user-facing feedback.

## useSocket Hook Usage
The `useSocket` hook is the single source of truth for real-time updates.
Never create a second Socket.IO connection anywhere else in the app:
```ts
// In a top-level layout component
useSocket(); // subscribes to shop-floor room, dispatches to stores

// ❌ Never create sockets directly in components
const socket = io(BASE_URL); // wrong
```

## Initial Data Fetching Pattern
Pages fetch data on mount using a custom hook per domain, not raw `useEffect` in components:
```ts
// src/hooks/useWorkOrders.ts
export function useWorkOrders() {
  const { setWorkOrders, isLoading: storeLoading } = useWorkOrderStore();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.get('/api/work-orders')
      .then(res => setWorkOrders(res.data))
      .catch(err => setError(getErrorMessage(err)));
  }, []);

  return { error };
}
```
- Data hooks live in `src/hooks/` alongside `useSocket` and `useAuth`
- Hooks write to the Zustand store; components read from the store — never from local state
- Socket.IO events update the same store, so no re-fetch is needed after real-time events
- Similar hooks exist for: `useAllocations`, `useOperators`, `useMachines`, `useMaterials`

## Form Handling Convention
Use controlled forms with local `useState` for create/edit forms. Do NOT use form libraries (react-hook-form, formik) for MVP scope:
```ts
const [form, setForm] = React.useState({ orderNumber: '', scheduledStart: '', scheduledEnd: '' });
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
  setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
```
- Validate required fields client-side before submitting (show inline error messages)
- On submit, call the API; on success close the modal/form and let the Socket.IO event update the store
- Form components live in `src/components/WorkOrders/WorkOrderForm.tsx`, `src/components/Resources/OperatorForm.tsx`, etc.

## Pages Structure
Each route has a corresponding page in `src/pages/`:
```
src/pages/
  LoginPage.tsx          ← public, redirects to /board after login
  BoardPage.tsx          ← main AllocationBoard view (protected)
  WorkOrdersPage.tsx     ← list + create/edit work orders (protected)
  ResourcesPage.tsx      ← Operators + Machines tabs (protected)
  MaterialsPage.tsx      ← Materials stock table (protected)
```
Pages are thin: they call the data hook, render a layout, and compose feature components.

## React Router
- Route definitions live in `src/App.tsx` (or `src/router.tsx`)
- Protected routes wrap around role check — redirect to `/login` if no token
- Use `<Outlet />` for nested layouts; layout components live in `src/components/layouts/`
- Route list:
  ```
  /login             ← LoginPage (public)
  /board             ← BoardPage (any authenticated role)
  /work-orders       ← WorkOrdersPage (any authenticated role)
  /resources         ← ResourcesPage (any authenticated role)
  /materials         ← MaterialsPage (any authenticated role)
  /                  → redirect to /board if authenticated, /login otherwise
  ```

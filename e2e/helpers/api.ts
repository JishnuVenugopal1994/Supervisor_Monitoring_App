import { request } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4000';

/** Log in as supervisor via the REST API and return the access token. */
export async function getSupervisorToken(): Promise<string> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  const res = await ctx.post('/api/auth/login', {
    data: { username: 'supervisor', password: 'password123' },
  });
  const data = await res.json() as { accessToken: string };
  await ctx.dispose();
  return data.accessToken;
}

/** Return all work orders as plain objects. */
export async function getWorkOrders(
  token: string,
): Promise<Array<{ id: string; orderNumber: string; status: string }>> {
  const ctx = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  const res = await ctx.get('/api/work-orders');
  const data = await res.json();
  await ctx.dispose();
  return data as Array<{ id: string; orderNumber: string; status: string }>;
}

/** PATCH a work order's status. */
export async function patchWorkOrderStatus(
  id: string,
  status: string,
  token: string,
): Promise<void> {
  const ctx = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  await ctx.patch(`/api/work-orders/${id}/status`, { data: { status } });
  await ctx.dispose();
}

/** Create an allocation directly via the API (bypasses UI). */
export async function createAllocationViaAPI(
  data: {
    workOrderId: string;
    startTime: string;
    endTime: string;
    operatorId?: string;
    machineId?: string;
  },
  token: string,
): Promise<{ id: string }> {
  const ctx = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  const res = await ctx.post('/api/allocations', {
    data: { ...data, materials: [] },
  });
  const result = await res.json();
  await ctx.dispose();
  return result as { id: string };
}

/**
 * Transition all active work orders to COMPLETED via the API.
 * Used for TC-BOARD-SUP-16 precondition setup.
 * Multi-step transitions (PENDING→IN_PROGRESS→COMPLETED) are kept sequential
 * per WO but all WOs are processed in parallel.
 */
export async function completeAllWorkOrders(token: string): Promise<void> {
  const wos = await getWorkOrders(token);
  const transitions: Record<string, string[]> = {
    PENDING: ['IN_PROGRESS', 'COMPLETED'],
    IN_PROGRESS: ['COMPLETED'],
    ON_HOLD: ['IN_PROGRESS', 'COMPLETED'],
    COMPLETED: [],
  };
  await Promise.all(
    wos.map(async (wo) => {
      for (const toStatus of transitions[wo.status] ?? []) {
        await patchWorkOrderStatus(wo.id, toStatus, token);
      }
    })
  );
}

/**
 * Delete all allocations via the API.
 * Faster alternative to reseedDB() when only allocation state needs resetting;
 * the service automatically restores operator/machine statuses on delete.
 */
export async function deleteAllAllocations(token: string): Promise<void> {
  const ctx = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  const res = await ctx.get('/api/allocations');
  const allocations = await res.json() as Array<{ id: string }>;
  await Promise.all(
    allocations.map((a) => ctx.delete(`/api/allocations/${a.id}`))
  );
  await ctx.dispose();
}

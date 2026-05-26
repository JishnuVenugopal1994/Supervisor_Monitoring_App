import { create } from 'zustand';
import { WorkOrder } from '../types';

interface WorkOrderStore {
  workOrders: WorkOrder[];
  isLoading: boolean;
  setWorkOrders: (items: WorkOrder[]) => void;
  addWorkOrder: (item: WorkOrder) => void;
  updateWorkOrder: (id: string, patch: Partial<WorkOrder>) => void;
  removeWorkOrder: (id: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useWorkOrderStore = create<WorkOrderStore>((set) => ({
  workOrders: [],
  isLoading: false,
  setWorkOrders: (items) => set({ workOrders: items }),
  addWorkOrder: (item) => set((s) => ({ workOrders: [...s.workOrders, item] })),
  updateWorkOrder: (id, patch) =>
    set((s) => ({
      workOrders: s.workOrders.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    })),
  removeWorkOrder: (id) => set((s) => ({ workOrders: s.workOrders.filter((w) => w.id !== id) })),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ workOrders: [], isLoading: false }),
}));

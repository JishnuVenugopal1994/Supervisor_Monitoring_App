import { create } from 'zustand';
import { Allocation } from '../types';

interface AllocationStore {
  allocations: Allocation[];
  isLoading: boolean;
  setAllocations: (items: Allocation[]) => void;
  addAllocation: (item: Allocation) => void;
  updateAllocation: (id: string, patch: Partial<Allocation>) => void;
  removeAllocation: (id: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAllocationStore = create<AllocationStore>((set) => ({
  allocations: [],
  isLoading: false,
  setAllocations: (items) => set({ allocations: items }),
  // Upserts intentionally: both the optimistic HTTP response and the subsequent
  // socket 'allocation:created' event call this. The upsert prevents duplicates
  // when both paths run for the same allocation.
  addAllocation: (item) =>
    set((s) => ({
      allocations: s.allocations.some((a) => a.id === item.id)
        ? s.allocations.map((a) => (a.id === item.id ? item : a))
        : [...s.allocations, item],
    })),
  updateAllocation: (id, patch) =>
    set((s) => ({
      allocations: s.allocations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),
  removeAllocation: (id) => set((s) => ({ allocations: s.allocations.filter((a) => a.id !== id) })),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ allocations: [], isLoading: false }),
}));

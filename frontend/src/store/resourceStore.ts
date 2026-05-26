import { create } from 'zustand';
import { Operator, Machine, Material } from '../types';

interface ResourceStore {
  operators: Operator[];
  machines: Machine[];
  materials: Material[];
  isLoading: boolean;
  setOperators: (items: Operator[]) => void;
  setMachines: (items: Machine[]) => void;
  setMaterials: (items: Material[]) => void;
  addOperator: (item: Operator) => void;
  addMachine: (item: Machine) => void;
  addMaterial: (item: Material) => void;
  updateOperator: (id: string, patch: Partial<Operator>) => void;
  updateMachine: (id: string, patch: Partial<Machine>) => void;
  updateMaterial: (id: string, patch: Partial<Material>) => void;
  removeOperator: (id: string) => void;
  removeMachine: (id: string) => void;
  removeMaterial: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useResourceStore = create<ResourceStore>((set) => ({
  operators: [],
  machines: [],
  materials: [],
  isLoading: false,
  setOperators: (items) => set({ operators: items }),
  setMachines: (items) => set({ machines: items }),
  setMaterials: (items) => set({ materials: items }),
  addOperator: (item) => set((s) => ({ operators: [...s.operators, item] })),
  addMachine: (item) => set((s) => ({ machines: [...s.machines, item] })),
  addMaterial: (item) => set((s) => ({ materials: [...s.materials, item] })),
  updateOperator: (id, patch) =>
    set((s) => ({ operators: s.operators.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
  updateMachine: (id, patch) =>
    set((s) => ({ machines: s.machines.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  updateMaterial: (id, patch) =>
    set((s) => ({ materials: s.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  removeOperator: (id) => set((s) => ({ operators: s.operators.filter((o) => o.id !== id) })),
  removeMachine: (id) => set((s) => ({ machines: s.machines.filter((m) => m.id !== id) })),
  removeMaterial: (id) => set((s) => ({ materials: s.materials.filter((m) => m.id !== id) })),
  setLoading: (loading) => set({ isLoading: loading }),
}));

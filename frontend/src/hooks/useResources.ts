import { useResourceStore } from '../store/resourceStore';
import { useFetchOnMount } from './useFetchOnMount';
import { Operator, Machine, Material } from '../types';

export function useOperators() {
  const { setOperators, setLoading } = useResourceStore();
  useFetchOnMount<Operator>('/api/operators', setOperators, setLoading);
}

export function useMachines() {
  const { setMachines, setLoading } = useResourceStore();
  useFetchOnMount<Machine>('/api/machines', setMachines, setLoading);
}

export function useMaterials() {
  const { setMaterials, setLoading } = useResourceStore();
  useFetchOnMount<Material>('/api/materials', setMaterials, setLoading);
}

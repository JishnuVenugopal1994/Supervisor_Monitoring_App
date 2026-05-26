import { useAllocationStore } from '../store/allocationStore';
import { useFetchOnMount } from './useFetchOnMount';
import { Allocation } from '../types';

export function useAllocations() {
  const { setAllocations, setLoading } = useAllocationStore();
  useFetchOnMount<Allocation>('/api/allocations', setAllocations, setLoading);
}

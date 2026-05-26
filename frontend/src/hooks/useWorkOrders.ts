import { useWorkOrderStore } from '../store/workOrderStore';
import { useFetchOnMount } from './useFetchOnMount';
import { WorkOrder } from '../types';

export function useWorkOrders() {
  const { setWorkOrders, setLoading } = useWorkOrderStore();
  useFetchOnMount<WorkOrder>('/api/work-orders', setWorkOrders, setLoading);
}

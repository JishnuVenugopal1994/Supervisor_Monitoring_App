import { useAllocationStore } from '../store/allocationStore';
import { useWorkOrderStore } from '../store/workOrderStore';
import { useAllocations } from '../hooks/useAllocations';
import { useWorkOrders } from '../hooks/useWorkOrders';
import { useOperators, useMachines } from '../hooks/useResources';
import AllocationBoard from '../components/AllocationBoard';

export default function BoardPage() {
  useWorkOrders();
  useAllocations();
  useOperators();
  useMachines();

  const { isLoading: allocLoading } = useAllocationStore();
  const { isLoading: woLoading } = useWorkOrderStore();

  if (allocLoading || woLoading) {
    return <div className="text-gray-500 text-sm">Loading board…</div>;
  }

  return <AllocationBoard />;
}

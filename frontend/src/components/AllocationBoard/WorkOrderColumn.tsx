import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import { WorkOrder, Allocation } from '../../types';
import AllocationCard from './AllocationCard';

interface Props {
  workOrder: WorkOrder;
  allocations: Allocation[];
  isSupervisor: boolean;
  onDelete: (id: string) => void;
  onTimeEdit: (id: string, startTime: string, endTime: string) => void;
}

const STATUS_COLORS: Record<WorkOrder['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-gray-100 text-gray-500',
};

export default function WorkOrderColumn({ workOrder, allocations, isSupervisor, onDelete, onTimeEdit }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: workOrder.id });

  return (
    <div
      ref={setNodeRef}
      data-testid="work-order-column"
      className={clsx(
        'flex-shrink-0 w-64 bg-white rounded-lg border flex flex-col',
        isOver ? 'border-blue-400 shadow-md' : 'border-gray-200'
      )}
    >
      {/* Column header */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-gray-800 text-sm truncate">{workOrder.orderNumber}</span>
          <span className={clsx('text-xs px-1.5 py-0.5 rounded', STATUS_COLORS[workOrder.status])}>
            {workOrder.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">{workOrder.title}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          <span>{allocations.length} resource(s)</span>
          <span>·</span>
          <span>Qty: {workOrder.targetQty}</span>
        </div>
      </div>

      {/* Allocations */}
      <div className="flex-1 p-2 flex flex-col gap-2 min-h-16">
        {allocations.length === 0 ? (
          <p className="text-xs text-yellow-600 text-center mt-2 px-2">No resources assigned</p>
        ) : (
          allocations.map((alloc) => (
            <AllocationCard
              key={alloc.id}
              allocation={alloc}
              isSupervisor={isSupervisor}
              onDelete={onDelete}
              onTimeEdit={onTimeEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}

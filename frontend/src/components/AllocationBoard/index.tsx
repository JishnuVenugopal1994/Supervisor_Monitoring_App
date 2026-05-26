import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import toast from 'react-hot-toast';
import { useAllocationStore } from '../../store/allocationStore';
import { useWorkOrderStore } from '../../store/workOrderStore';
import { useResourceStore } from '../../store/resourceStore';
import { useAuth } from '../../hooks/useAuth';
import api, { getErrorMessage } from '../../services/api';
import { Allocation } from '../../types';
import AllocationCard from './AllocationCard';
import WorkOrderColumn from './WorkOrderColumn';
import ResourcePanel from './ResourcePanel';

export default function AllocationBoard() {
  const { allocations, addAllocation, updateAllocation, removeAllocation, setAllocations } =
    useAllocationStore();
  const { workOrders } = useWorkOrderStore();
  const { operators, machines } = useResourceStore();
  const { isSupervisor } = useAuth();

  const [activeAllocation, setActiveAllocation] = useState<Allocation | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activeWorkOrders = workOrders.filter((wo) => wo.status !== 'COMPLETED');

  const idleOperatorCount = operators.filter((o) => o.status === 'AVAILABLE').length;
  const idleMachineCount = machines.filter((m) => m.status === 'AVAILABLE').length;

  function handleDragStart(event: DragStartEvent) {
    const alloc = allocations.find((a) => a.id === event.active.id);
    setActiveAllocation(alloc ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveAllocation(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedId = active.id as string;
    const targetWorkOrderId = over.id as string;

    const alloc = allocations.find((a) => a.id === draggedId);
    if (!alloc || alloc.workOrderId === targetWorkOrderId) return;

    const prev = allocations.map((a) => ({ ...a }));
    updateAllocation(draggedId, { workOrderId: targetWorkOrderId });

    try {
      const updated = await api.patch<Allocation>(`/api/allocations/${draggedId}`, {
        workOrderId: targetWorkOrderId,
      });
      updateAllocation(draggedId, updated.data);
      toast.success('Allocation moved');
    } catch (err) {
      setAllocations(prev);
      toast.error(getErrorMessage(err));
    }
  }

  async function handleNewAssignment(
    workOrderId: string,
    resourceType: 'operator' | 'machine',
    resourceId: string
  ) {
    const workOrder = workOrders.find((w) => w.id === workOrderId);
    if (!workOrder) return;

    const payload = {
      workOrderId,
      operatorId: resourceType === 'operator' ? resourceId : undefined,
      machineId: resourceType === 'machine' ? resourceId : undefined,
      startTime: workOrder.scheduledStart,
      endTime: workOrder.scheduledEnd,
      materials: [],
    };

    try {
      const { data } = await api.post<Allocation>('/api/allocations', payload);
      addAllocation(data);
      toast.success('Resource assigned');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete(id: string) {
    const prev = allocations.map((a) => ({ ...a }));
    removeAllocation(id);
    try {
      await api.delete(`/api/allocations/${id}`);
      toast.success('Allocation removed');
    } catch (err) {
      setAllocations(prev);
      toast.error(getErrorMessage(err));
    }
  }

  async function handleTimeEdit(id: string, startTime: string, endTime: string) {
    const prev = allocations.map((a) => ({ ...a }));
    updateAllocation(id, { startTime, endTime });
    try {
      const { data } = await api.patch<Allocation>(`/api/allocations/${id}`, { startTime, endTime });
      updateAllocation(id, data);
    } catch (err) {
      setAllocations(prev);
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Idle summary header */}
      <div className="fixed top-16 right-6 flex gap-3 text-xs z-10">
        <span data-testid="idle-operators" className="bg-green-100 text-green-700 px-2 py-1 rounded">
          Idle Operators: {idleOperatorCount}
        </span>
        <span data-testid="idle-machines" className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
          Idle Machines: {idleMachineCount}
        </span>
      </div>

      {/* Resource panel — left sidebar */}
      {isSupervisor && (
        <ResourcePanel onAssign={handleNewAssignment} workOrders={activeWorkOrders} />
      )}

      {/* Work order columns */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {activeWorkOrders.map((wo) => {
            const woAllocations = allocations.filter((a) => a.workOrderId === wo.id);
            return (
              <WorkOrderColumn
                key={wo.id}
                workOrder={wo}
                allocations={woAllocations}
                isSupervisor={isSupervisor}
                onDelete={handleDelete}
                onTimeEdit={handleTimeEdit}
              />
            );
          })}
          {activeWorkOrders.length === 0 && (
            <p className="text-gray-400 text-sm mt-8">No active work orders.</p>
          )}
        </div>

        <DragOverlay>
          {activeAllocation && (
            <AllocationCard
              allocation={activeAllocation}
              isSupervisor={false}
              onDelete={() => {}}
              onTimeEdit={() => {}}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

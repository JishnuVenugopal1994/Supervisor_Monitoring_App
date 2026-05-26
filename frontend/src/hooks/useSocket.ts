import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAllocationStore } from '../store/allocationStore';
import { useWorkOrderStore } from '../store/workOrderStore';
import { useResourceStore } from '../store/resourceStore';
import { getAccessToken } from '../services/api';
import { Allocation, WorkOrderStatus, OperatorStatus, MachineStatus } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL as string;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  const { addAllocation, updateAllocation, removeAllocation } = useAllocationStore();
  const { updateWorkOrder } = useWorkOrderStore();
  const { updateOperator, updateMachine } = useResourceStore();

  useEffect(() => {
    if (socketRef.current) return;

    const socket = io(BASE_URL, {
      withCredentials: true,
      auth: { token: getAccessToken() },
    });
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      toast.error(`Real-time connection lost: ${err.message}`);
    });

    socket.on('allocation:created', (allocation: Allocation) => {
      addAllocation(allocation);
    });

    socket.on('allocation:updated', (allocation: Allocation) => {
      updateAllocation(allocation.id, allocation);
    });

    socket.on('allocation:deleted', ({ id }: { id: string }) => {
      removeAllocation(id);
    });

    socket.on('workOrder:statusChanged', ({ id, status }: { id: string; status: WorkOrderStatus }) => {
      updateWorkOrder(id, { status });
    });

    socket.on(
      'resource:statusChanged',
      ({
        type,
        id,
        status,
      }: {
        type: 'operator' | 'machine';
        id: string;
        status: OperatorStatus | MachineStatus;
      }) => {
        if (type === 'operator') updateOperator(id, { status: status as OperatorStatus });
        if (type === 'machine') updateMachine(id, { status: status as MachineStatus });
      }
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [addAllocation, updateAllocation, removeAllocation, updateWorkOrder, updateOperator, updateMachine]);
}

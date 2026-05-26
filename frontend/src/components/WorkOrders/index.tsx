import { useState } from 'react';
import toast from 'react-hot-toast';
import { useWorkOrderStore } from '../../store/workOrderStore';
import { useAuth } from '../../hooks/useAuth';
import api, { getErrorMessage } from '../../services/api';
import { WorkOrder } from '../../types';
import WorkOrderForm from './WorkOrderForm';

const STATUS_COLORS: Record<WorkOrder['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-gray-100 text-gray-500',
};

const TRANSITIONS: Record<WorkOrder['status'], WorkOrder['status'][]> = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED', 'ON_HOLD'],
  ON_HOLD: ['IN_PROGRESS'],
  COMPLETED: [],
};

export default function WorkOrderList() {
  const { workOrders, addWorkOrder, updateWorkOrder, removeWorkOrder } = useWorkOrderStore();
  const { isSupervisor } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);

  async function handleCreate(data: Omit<WorkOrder, 'id' | 'status'>) {
    try {
      const { data: wo } = await api.post<WorkOrder>('/api/work-orders', data);
      addWorkOrder(wo);
      setShowForm(false);
      toast.success('Work order created');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleUpdate(id: string, data: Partial<WorkOrder>) {
    try {
      const { data: wo } = await api.patch<WorkOrder>(`/api/work-orders/${id}`, data);
      updateWorkOrder(id, wo);
      setEditing(null);
      toast.success('Work order updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleTransition(id: string, status: WorkOrder['status']) {
    try {
      const { data: wo } = await api.patch<WorkOrder>(`/api/work-orders/${id}/status`, { status });
      updateWorkOrder(id, { status: wo.status });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/work-orders/${id}`);
      removeWorkOrder(id);
      toast.success('Work order deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Work Orders</h2>
        {isSupervisor && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700"
          >
            + New Work Order
          </button>
        )}
      </div>

      {(showForm || editing) && (
        <WorkOrderForm
          initial={editing ?? undefined}
          onSave={(data) =>
            editing ? handleUpdate(editing.id, data) : handleCreate(data as Omit<WorkOrder, 'id' | 'status'>)
          }
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="pb-2 pr-4">Order #</th>
              <th className="pb-2 pr-4">Title</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Start</th>
              <th className="pb-2 pr-4">End</th>
              <th className="pb-2 pr-4">Target Qty</th>
              {isSupervisor && <th className="pb-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {workOrders.map((wo) => (
              <tr key={wo.id} data-testid="work-order-row" className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 pr-4 font-medium">{wo.orderNumber}</td>
                <td className="py-2 pr-4 text-gray-600">{wo.title}</td>
                <td className="py-2 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[wo.status]}`}>
                    {wo.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-2 pr-4 text-gray-500">
                  {new Date(wo.scheduledStart).toLocaleDateString()}
                </td>
                <td className="py-2 pr-4 text-gray-500">
                  {new Date(wo.scheduledEnd).toLocaleDateString()}
                </td>
                <td className="py-2 pr-4 text-gray-500">{wo.targetQty}</td>
                {isSupervisor && (
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      {TRANSITIONS[wo.status].map((next) => (
                        <button
                          key={next}
                          onClick={() => handleTransition(wo.id, next)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          → {next.replace('_', ' ')}
                        </button>
                      ))}
                      <button
                        onClick={() => setEditing(wo)}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Edit
                      </button>
                      {wo.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleDelete(wo.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {workOrders.length === 0 && (
          <p className="text-gray-400 text-sm mt-4">No work orders yet.</p>
        )}
      </div>
    </div>
  );
}

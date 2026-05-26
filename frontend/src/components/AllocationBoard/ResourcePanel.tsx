import { useState } from 'react';
import clsx from 'clsx';
import { useResourceStore } from '../../store/resourceStore';
import { WorkOrder, Operator, Machine } from '../../types';

interface Props {
  workOrders: WorkOrder[];
  onAssign: (workOrderId: string, type: 'operator' | 'machine', resourceId: string) => void;
}

export default function ResourcePanel({ workOrders, onAssign }: Props) {
  const { operators, machines } = useResourceStore();
  const [skillFilter, setSkillFilter] = useState('');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('');

  const allSkills = Array.from(new Set(operators.flatMap((o) => o.skills))).sort();

  const filteredOperators = skillFilter
    ? operators.filter((o) => o.skills.includes(skillFilter))
    : operators;

  const statusChip = (status: Operator['status'] | Machine['status']) => {
    const map: Record<string, string> = {
      AVAILABLE: 'bg-green-100 text-green-700',
      ASSIGNED: 'bg-blue-100 text-blue-700',
      RUNNING: 'bg-blue-100 text-blue-700',
      ABSENT: 'bg-gray-100 text-gray-500',
      MAINTENANCE: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-500';
  };

  function handleAssign(type: 'operator' | 'machine', resourceId: string) {
    if (!selectedWorkOrderId) return;
    onAssign(selectedWorkOrderId, type, resourceId);
  }

  return (
    <div className="w-56 flex-shrink-0 bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-3 overflow-y-auto max-h-screen">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Assign to work order</label>
        <select
          value={selectedWorkOrderId}
          onChange={(e) => setSelectedWorkOrderId(e.target.value)}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="">Select…</option>
          {workOrders.map((wo) => (
            <option key={wo.id} value={wo.id}>
              {wo.orderNumber}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500">Operators</span>
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded px-1 py-0.5"
          >
            <option value="">All skills</option>
            {allSkills.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          {filteredOperators.map((op) => (
            <div
              key={op.id}
              data-testid="resource-operator"
              className={clsx(
                'flex items-center justify-between rounded px-2 py-1 text-xs',
                op.status === 'AVAILABLE'
                  ? 'bg-gray-50 hover:bg-blue-50 cursor-pointer'
                  : 'bg-gray-50 opacity-60 cursor-not-allowed'
              )}
              onClick={() => op.status === 'AVAILABLE' && handleAssign('operator', op.id)}
              title={op.status === 'AVAILABLE' ? `Assign ${op.name}` : op.status}
            >
              <span className="truncate">{op.name}</span>
              <span className={clsx('ml-1 px-1 rounded', statusChip(op.status))}>
                {op.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-xs font-medium text-gray-500 block mb-1">Machines</span>
        <div className="flex flex-col gap-1">
          {machines.map((m) => (
            <div
              key={m.id}
              data-testid="resource-machine"
              className={clsx(
                'flex items-center justify-between rounded px-2 py-1 text-xs',
                m.status === 'AVAILABLE'
                  ? 'bg-gray-50 hover:bg-blue-50 cursor-pointer'
                  : 'bg-gray-50 opacity-60 cursor-not-allowed'
              )}
              onClick={() => m.status === 'AVAILABLE' && handleAssign('machine', m.id)}
              title={m.status === 'AVAILABLE' ? `Assign ${m.name}` : m.status}
            >
              <span className="truncate">{m.name}</span>
              <span className={clsx('ml-1 px-1 rounded', statusChip(m.status))}>
                {m.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

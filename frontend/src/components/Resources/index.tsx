import { useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useResourceStore } from '../../store/resourceStore';
import { useAuth } from '../../hooks/useAuth';
import api, { getErrorMessage } from '../../services/api';
import { Operator, Machine } from '../../types';
import OperatorForm from './OperatorForm';
import MachineForm from './MachineForm';

type Tab = 'operators' | 'machines';

const OPERATOR_STATUS_COLORS: Record<Operator['status'], string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  ABSENT: 'bg-gray-100 text-gray-500',
};

const MACHINE_STATUS_COLORS: Record<Machine['status'], string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-red-100 text-red-700',
};

export default function ResourcePanel() {
  const { operators, machines, addOperator, addMachine, updateOperator, updateMachine, removeOperator, removeMachine } = useResourceStore();
  const { isSupervisor } = useAuth();
  const [tab, setTab] = useState<Tab>('operators');
  const [showForm, setShowForm] = useState(false);

  async function handleAddOperator(data: Omit<Operator, 'id' | 'status'>) {
    try {
      const { data: op } = await api.post<Operator>('/api/operators', data);
      addOperator(op);
      setShowForm(false);
      toast.success('Operator added');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleAddMachine(data: Omit<Machine, 'id' | 'status'>) {
    try {
      const { data: m } = await api.post<Machine>('/api/machines', data);
      addMachine(m);
      setShowForm(false);
      toast.success('Machine added');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleMarkAbsent(id: string) {
    try {
      const { data: op } = await api.patch<Operator>(`/api/operators/${id}`, { status: 'ABSENT' });
      updateOperator(id, { status: op.status });
      toast.success('Operator marked absent');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleMarkMaintenance(id: string) {
    try {
      const { data: m } = await api.patch<Machine>(`/api/machines/${id}`, { status: 'MAINTENANCE' });
      updateMachine(id, { status: m.status });
      toast.success('Machine set to maintenance');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDeleteOperator(id: string) {
    try {
      await api.delete(`/api/operators/${id}`);
      removeOperator(id);
      toast.success('Operator removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDeleteMachine(id: string) {
    try {
      await api.delete(`/api/machines/${id}`);
      removeMachine(id);
      toast.success('Machine removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3">
          {(['operators', 'machines'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setShowForm(false); }}
              className={clsx(
                'text-sm font-medium pb-1 border-b-2',
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {isSupervisor && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700"
          >
            + Add {tab === 'operators' ? 'Operator' : 'Machine'}
          </button>
        )}
      </div>

      {showForm && tab === 'operators' && (
        <OperatorForm onSave={handleAddOperator} onCancel={() => setShowForm(false)} />
      )}
      {showForm && tab === 'machines' && (
        <MachineForm onSave={handleAddMachine} onCancel={() => setShowForm(false)} />
      )}

      {tab === 'operators' && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="pb-2 pr-4">Employee ID</th>
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Skills</th>
              <th className="pb-2 pr-4">Status</th>
              {isSupervisor && <th className="pb-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {operators.map((op) => (
              <tr key={op.id} data-testid="operator-row" className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 pr-4 font-medium">{op.employeeId}</td>
                <td className="py-2 pr-4">{op.name}</td>
                <td className="py-2 pr-4 text-gray-500">{op.skills.join(', ') || '—'}</td>
                <td className="py-2 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded ${OPERATOR_STATUS_COLORS[op.status]}`}>
                    {op.status}
                  </span>
                </td>
                {isSupervisor && (
                  <td className="py-2">
                    <div className="flex gap-2">
                      {op.status !== 'ABSENT' && (
                        <button onClick={() => handleMarkAbsent(op.id)} className="text-xs text-orange-500 hover:underline">
                          Mark Absent
                        </button>
                      )}
                      <button onClick={() => handleDeleteOperator(op.id)} className="text-xs text-red-500 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'machines' && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="pb-2 pr-4">Code</th>
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2 pr-4">Status</th>
              {isSupervisor && <th className="pb-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {machines.map((m) => (
              <tr key={m.id} data-testid="machine-row" className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 pr-4 font-medium">{m.machineCode}</td>
                <td className="py-2 pr-4">{m.name}</td>
                <td className="py-2 pr-4 text-gray-500">{m.type}</td>
                <td className="py-2 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded ${MACHINE_STATUS_COLORS[m.status]}`}>
                    {m.status}
                  </span>
                </td>
                {isSupervisor && (
                  <td className="py-2">
                    <div className="flex gap-2">
                      {m.status !== 'MAINTENANCE' && (
                        <button onClick={() => handleMarkMaintenance(m.id)} className="text-xs text-orange-500 hover:underline">
                          Set Maintenance
                        </button>
                      )}
                      <button onClick={() => handleDeleteMachine(m.id)} className="text-xs text-red-500 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Allocation } from '../../types';

interface Props {
  allocation: Allocation;
  isSupervisor: boolean;
  onDelete: (id: string) => void;
  onTimeEdit: (id: string, startTime: string, endTime: string) => void;
  isDragging?: boolean;
}

export default function AllocationCard({ allocation, isSupervisor, onDelete, onTimeEdit, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: allocation.id });
  const [editingTime, setEditingTime] = useState(false);
  const [startTime, setStartTime] = useState(() => new Date(allocation.startTime).toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(() => new Date(allocation.endTime).toISOString().slice(0, 16));

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const operatorStatus = allocation.operator?.status;
  const machineStatus = allocation.machine?.status;

  const cardClass = clsx(
    'relative rounded border p-3 text-sm select-none',
    isDragging && 'opacity-50 shadow-lg rotate-1',
    !isDragging && operatorStatus === 'ASSIGNED' && 'bg-blue-50 border-blue-200',
    !isDragging && machineStatus === 'RUNNING' && 'bg-blue-50 border-blue-200',
    !isDragging && !operatorStatus && !machineStatus && 'bg-white border-gray-200',
    isSupervisor && !isDragging && 'cursor-grab active:cursor-grabbing'
  );

  function handleTimeSave() {
    if (new Date(endTime) <= new Date(startTime)) {
      toast.error('End time must be after start time');
      return;
    }
    onTimeEdit(allocation.id, new Date(startTime).toISOString(), new Date(endTime).toISOString());
    setEditingTime(false);
  }

  return (
    <div
      ref={setNodeRef}
      data-testid="allocation-card"
      style={style}
      className={cardClass}
      {...(isSupervisor ? { ...listeners, ...attributes } : {})}
    >
      {isSupervisor && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(allocation.id); }}
          className="absolute top-1 right-1 text-gray-300 hover:text-red-500 text-xs leading-none"
          title="Remove allocation"
        >
          ✕
        </button>
      )}

      {allocation.operator && (
        <div className="font-medium text-gray-800 truncate">
          {allocation.operator.name}
        </div>
      )}
      {allocation.machine && (
        <div className="font-medium text-gray-800 truncate">
          {allocation.machine.name}
        </div>
      )}
      {!allocation.operator && !allocation.machine && (
        <div className="text-gray-400 italic text-xs">Unnamed allocation</div>
      )}

      {!editingTime ? (
        <div
          className={clsx('text-xs text-gray-400 mt-1', isSupervisor && 'cursor-pointer hover:text-blue-500')}
          onClick={isSupervisor ? () => setEditingTime(true) : undefined}
          title={isSupervisor ? 'Click to edit times' : undefined}
        >
          {new Date(allocation.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {' – '}
          {new Date(allocation.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      ) : (
        <div className="mt-1 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="text-xs border border-gray-300 rounded px-1 py-0.5"
          />
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="text-xs border border-gray-300 rounded px-1 py-0.5"
          />
          <div className="flex gap-1">
            <button onClick={handleTimeSave} className="text-xs text-blue-600 hover:underline">Save</button>
            <button onClick={() => setEditingTime(false)} className="text-xs text-gray-400 hover:underline">Cancel</button>
          </div>
        </div>
      )}

      {allocation.materials && allocation.materials.length > 0 && (
        <div className="text-xs text-gray-400 mt-1">
          {allocation.materials.length} material(s)
        </div>
      )}
    </div>
  );
}

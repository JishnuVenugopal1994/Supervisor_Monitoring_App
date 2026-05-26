import React, { useState } from 'react';
import { WorkOrder } from '../../types';

interface Props {
  initial?: Partial<WorkOrder>;
  onSave: (data: Partial<WorkOrder>) => void;
  onCancel: () => void;
}

export default function WorkOrderForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState({
    orderNumber: initial?.orderNumber ?? '',
    title: initial?.title ?? '',
    scheduledStart: initial?.scheduledStart?.slice(0, 16) ?? '',
    scheduledEnd: initial?.scheduledEnd?.slice(0, 16) ?? '',
    targetQty: initial?.targetQty?.toString() ?? '',
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderNumber || !form.title || !form.scheduledStart || !form.scheduledEnd || !form.targetQty) {
      setError('All fields are required');
      return;
    }
    if (new Date(form.scheduledEnd) <= new Date(form.scheduledStart)) {
      setError('End must be after start');
      return;
    }
    setError('');
    onSave({
      orderNumber: form.orderNumber,
      title: form.title,
      scheduledStart: new Date(form.scheduledStart).toISOString(),
      scheduledEnd: new Date(form.scheduledEnd).toISOString(),
      targetQty: parseInt(form.targetQty, 10),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 grid grid-cols-2 gap-3">
      {[
        { name: 'orderNumber', label: 'Order Number' },
        { name: 'title', label: 'Title' },
        { name: 'scheduledStart', label: 'Start', type: 'datetime-local' },
        { name: 'scheduledEnd', label: 'End', type: 'datetime-local' },
        { name: 'targetQty', label: 'Target Qty', type: 'number' },
      ].map(({ name, label, type = 'text' }) => (
        <div key={name}>
          <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
          <input
            name={name}
            type={type}
            value={form[name as keyof typeof form]}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      ))}
      {error && <p className="col-span-2 text-xs text-red-600">{error}</p>}
      <div className="col-span-2 flex gap-2">
        <button type="submit" className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">
          Save
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 px-3 py-1.5 rounded hover:bg-gray-100">
          Cancel
        </button>
      </div>
    </form>
  );
}

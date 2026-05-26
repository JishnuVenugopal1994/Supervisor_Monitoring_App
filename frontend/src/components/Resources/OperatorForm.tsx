import React, { useState } from 'react';
import { Operator } from '../../types';

interface Props {
  onSave: (data: Omit<Operator, 'id' | 'status'>) => void;
  onCancel: () => void;
}

export default function OperatorForm({ onSave, onCancel }: Props) {
  const [form, setForm] = useState({ employeeId: '', name: '', skills: '' });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.name) { setError('Employee ID and name are required'); return; }
    setError('');
    onSave({
      employeeId: form.employeeId,
      name: form.name,
      skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap gap-3">
      {[
        { name: 'employeeId', label: 'Employee ID' },
        { name: 'name', label: 'Name' },
        { name: 'skills', label: 'Skills (comma-separated)' },
      ].map(({ name, label }) => (
        <div key={name} className="flex-1 min-w-36">
          <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
          <input
            name={name}
            value={form[name as keyof typeof form]}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      ))}
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
      <div className="w-full flex gap-2">
        <button type="submit" className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">Save</button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 px-3 py-1.5 rounded hover:bg-gray-100">Cancel</button>
      </div>
    </form>
  );
}

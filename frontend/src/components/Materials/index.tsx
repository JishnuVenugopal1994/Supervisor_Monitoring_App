import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useResourceStore } from '../../store/resourceStore';
import { useAuth } from '../../hooks/useAuth';
import api, { getErrorMessage } from '../../services/api';
import { Material } from '../../types';

export default function MaterialList() {
  const { materials, addMaterial, updateMaterial, removeMaterial } = useResourceStore();
  const { isSupervisor } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sku: '', name: '', unitOfMeasure: '', quantityOnHand: '' });
  const [formError, setFormError] = useState('');

  async function handleAddMaterial() {
    if (!form.sku || !form.name || !form.unitOfMeasure || !form.quantityOnHand) {
      setFormError('All fields required');
      return;
    }
    try {
      const { data } = await api.post<Material>('/api/materials', {
        ...form,
        quantityOnHand: parseFloat(form.quantityOnHand),
      });
      addMaterial(data);
      setShowForm(false);
      setForm({ sku: '', name: '', unitOfMeasure: '', quantityOnHand: '' });
      toast.success('Material added');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleSetQty(id: string) {
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty < 0) { toast.error('Invalid quantity'); return; }
    try {
      const { data } = await api.patch<Material>(`/api/materials/${id}`, { quantityOnHand: qty });
      updateMaterial(id, { quantityOnHand: data.quantityOnHand });
      setEditingId(null);
      toast.success('Stock updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/materials/${id}`);
      removeMaterial(id);
      toast.success('Material removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Materials</h2>
        {isSupervisor && (
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">
            + Add Material
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap gap-3">
          {[
            { name: 'sku', label: 'SKU' },
            { name: 'name', label: 'Name' },
            { name: 'unitOfMeasure', label: 'Unit' },
            { name: 'quantityOnHand', label: 'Qty on Hand', type: 'number' },
          ].map(({ name, label, type = 'text' }) => (
            <div key={name} className="flex-1 min-w-32">
              <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
              <input
                name={name}
                type={type}
                value={form[name as keyof typeof form]}
                onChange={handleFormChange}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
          ))}
          {formError && <p className="w-full text-xs text-red-600">{formError}</p>}
          <div className="w-full flex gap-2">
            <button onClick={handleAddMaterial} className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">Save</button>
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-3 py-1.5 rounded hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      )}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="pb-2 pr-4">SKU</th>
            <th className="pb-2 pr-4">Name</th>
            <th className="pb-2 pr-4">Unit</th>
            <th className="pb-2 pr-4">Qty on Hand</th>
            {isSupervisor && <th className="pb-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {materials.map((m) => (
            <tr key={m.id} data-testid="material-row" className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 pr-4 font-medium">{m.sku}</td>
              <td className="py-2 pr-4">{m.name}</td>
              <td className="py-2 pr-4 text-gray-500">{m.unitOfMeasure}</td>
              <td className="py-2 pr-4">
                {editingId === m.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editQty}
                      onChange={(e) => setEditQty(e.target.value)}
                      className="w-20 border border-gray-300 rounded px-1 py-0.5 text-xs"
                      autoFocus
                    />
                    <button onClick={() => handleSetQty(m.id)} className="text-xs text-blue-600 hover:underline">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                  </div>
                ) : (
                  <span className={m.quantityOnHand <= 0 ? 'text-red-600 font-medium' : ''}>
                    {m.quantityOnHand}
                  </span>
                )}
              </td>
              {isSupervisor && (
                <td className="py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingId(m.id); setEditQty(m.quantityOnHand.toString()); }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Adjust
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="text-xs text-red-500 hover:underline">
                      Delete
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {materials.length === 0 && <p className="text-gray-400 text-sm mt-4">No materials yet.</p>}
    </div>
  );
}

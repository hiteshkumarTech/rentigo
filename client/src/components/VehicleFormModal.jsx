import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { api } from '../lib/api.js';

const EMPTY = {
  name: '',
  brand: '',
  model_year: new Date().getFullYear(),
  type: '4W',
  fuel_type: 'Petrol',
  transmission: 'Manual',
  seats: 5,
  vehicle_number: '',
  price_daily: '',
  price_weekly: '',
  price_monthly: '',
  location: '',
  image_url: '',
  description: '',
};

export default function VehicleFormModal({ open, initial, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        initial
          ? { ...EMPTY, ...initial, image_url: initial.image_url || '', description: initial.description || '' }
          : EMPTY
      );
    }
  }, [open, initial]);

  if (!open) return null;

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      if (initial?.id) await api.put(`/api/vehicles/${initial.id}`, form);
      else await api.post('/api/vehicles', form);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto !bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-3xl uppercase text-white">
            {initial?.id ? 'Edit vehicle' : 'Add a vehicle'}
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white" aria-label="Close">
            <X size={22} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Model name</label>
            <input className="input" name="name" value={form.name} onChange={set} placeholder="Classic 350" />
          </div>
          <div>
            <label className="label">Brand</label>
            <input className="input" name="brand" value={form.brand} onChange={set} placeholder="Royal Enfield" />
          </div>
          <div>
            <label className="label">Model year</label>
            <input className="input" type="number" name="model_year" value={form.model_year} onChange={set} />
          </div>
          <div>
            <label className="label">Registration number</label>
            <input className="input" name="vehicle_number" value={form.vehicle_number} onChange={set} placeholder="HP01A1234" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" name="type" value={form.type} onChange={set}>
              <option value="2W">2-Wheeler</option>
              <option value="4W">4-Wheeler</option>
            </select>
          </div>
          <div>
            <label className="label">Fuel</label>
            <select className="input" name="fuel_type" value={form.fuel_type} onChange={set}>
              {['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Transmission</label>
            <select className="input" name="transmission" value={form.transmission} onChange={set}>
              <option>Manual</option>
              <option>Automatic</option>
            </select>
          </div>
          <div>
            <label className="label">Seats</label>
            <input className="input" type="number" name="seats" value={form.seats} onChange={set} min="1" max="12" />
          </div>
          <div>
            <label className="label">Price / day (₹)</label>
            <input className="input" type="number" name="price_daily" value={form.price_daily} onChange={set} min="1" />
          </div>
          <div>
            <label className="label">Price / week (₹)</label>
            <input className="input" type="number" name="price_weekly" value={form.price_weekly} onChange={set} min="1" />
          </div>
          <div>
            <label className="label">Price / month (₹)</label>
            <input className="input" type="number" name="price_monthly" value={form.price_monthly} onChange={set} min="1" />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" name="location" value={form.location} onChange={set} placeholder="Shimla" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Image URL (optional)</label>
            <input className="input" name="image_url" value={form.image_url} onChange={set} placeholder="https://…" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description (optional)</label>
            <textarea className="input min-h-[84px]" name="description" value={form.description} onChange={set} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-brand" onClick={submit} disabled={saving}>
            {saving && <Loader2 size={15} className="animate-spin" />}
            {initial?.id ? 'Save changes' : 'Submit for approval'}
          </button>
        </div>
      </div>
    </div>
  );
}

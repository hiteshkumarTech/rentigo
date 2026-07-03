import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import StatusChip from '../StatusChip.jsx';
import VehicleFormModal from '../VehicleFormModal.jsx';
import { api } from '../../lib/api.js';
import { FALLBACK_IMG, fmtDate, inr, onImgError, todayISO } from '../../lib/format.js';

function Stat({ label, value, accent }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p className={`mt-1 font-display text-4xl ${accent ? 'text-brand' : 'text-white'}`}>{value}</p>
    </div>
  );
}

export default function AgencyPanel() {
  const [tab, setTab] = useState('fleet');
  const [fleet, setFleet] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [message, setMessage] = useState(null); // { type: 'error' | 'ok', text }
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState({ open: false, vehicle: null });

  const load = () => {
    Promise.all([api.get('/api/vehicles/mine'), api.get('/api/bookings/agency')])
      .then(([f, b]) => {
        setFleet(f.vehicles);
        setBookings(b.bookings);
      })
      .catch((e) => setMessage({ type: 'error', text: e.message }));
  };
  useEffect(load, []);

  const stats = useMemo(() => {
    if (!fleet || !bookings) return null;
    const today = todayISO();
    return {
      fleetSize: fleet.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      activeToday: bookings.filter((b) => b.status === 'approved' && b.start_date <= today && b.end_date >= today).length,
      revenue: bookings
        .filter((b) => ['approved', 'completed'].includes(b.status))
        .reduce((s, b) => s + b.total_price, 0),
    };
  }, [fleet, bookings]);

  const setAvailability = async (v, availability) => {
    setBusyId(`v${v.id}`);
    setMessage(null);
    try {
      await api.patch(`/api/vehicles/${v.id}/availability`, { availability });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (v) => {
    if (!window.confirm(`Delete ${v.brand} ${v.name} (${v.vehicle_number}) from your fleet?`)) return;
    setBusyId(`v${v.id}`);
    setMessage(null);
    try {
      await api.del(`/api/vehicles/${v.id}`);
      setMessage({ type: 'ok', text: 'Vehicle removed.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const setBookingStatus = async (b, status) => {
    setBusyId(`b${b.id}`);
    setMessage(null);
    try {
      await api.patch(`/api/bookings/${b.id}/status`, { status });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: e.message }); // approval-time conflicts (409) surface here
    } finally {
      setBusyId(null);
    }
  };

  if (!fleet || !bookings) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Fleet size" value={stats.fleetSize} />
        <Stat label="Pending requests" value={stats.pending} accent={stats.pending > 0} />
        <Stat label="Active rentals today" value={stats.activeToday} />
        <Stat label="Confirmed revenue" value={inr(stats.revenue)} accent />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {[
            ['fleet', `Fleet (${fleet.length})`],
            ['bookings', `Bookings (${bookings.length})`],
          ].map(([key, lab]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                tab === key ? 'bg-brand text-ink' : 'text-white/60 hover:text-white'
              }`}
            >
              {lab}
            </button>
          ))}
        </div>
        {tab === 'fleet' && (
          <button className="btn-brand" onClick={() => setModal({ open: true, vehicle: null })}>
            <Plus size={15} /> Add vehicle
          </button>
        )}
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'border-red-400/30 bg-red-400/10 text-red-300'
              : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {tab === 'fleet' ? (
        fleet.length === 0 ? (
          <div className="card px-6 py-16 text-center">
            <p className="font-display text-3xl uppercase text-white/70">Your fleet is empty</p>
            <p className="mt-2 text-sm text-white/45">List your first vehicle — it goes live once an admin approves it.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="th">Vehicle</th>
                  <th className="th">Reg. no.</th>
                  <th className="th">₹/day</th>
                  <th className="th">Listing</th>
                  <th className="th">Availability</th>
                  <th className="th">Active</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {fleet.map((v) => (
                  <tr key={v.id}>
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <img
                          src={v.image_url || FALLBACK_IMG}
                          onError={onImgError}
                          alt=""
                          className="h-10 w-14 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-semibold text-white">
                            {v.brand} {v.name}
                          </p>
                          <p className="text-xs text-white/40">
                            {v.type} · {v.fuel_type} · {v.location}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="td">{v.vehicle_number}</td>
                    <td className="td">{inr(v.price_daily)}</td>
                    <td className="td">
                      <StatusChip status={v.status} />
                    </td>
                    <td className="td">
                      <select
                        className="input !w-auto !px-2.5 !py-1.5 !text-xs"
                        value={v.availability}
                        onChange={(e) => setAvailability(v, e.target.value)}
                        disabled={busyId === `v${v.id}`}
                      >
                        <option value="available">Available</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </td>
                    <td className="td">{v.active_bookings}</td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn-ghost !px-2.5 !py-1.5"
                          onClick={() => setModal({ open: true, vehicle: v })}
                          aria-label="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn-danger !px-2.5 !py-1.5"
                          onClick={() => remove(v)}
                          disabled={busyId === `v${v.id}`}
                          aria-label="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : bookings.length === 0 ? (
        <div className="card px-6 py-16 text-center">
          <p className="font-display text-3xl uppercase text-white/70">No bookings yet</p>
          <p className="mt-2 text-sm text-white/45">Requests on your vehicles will land here for approval.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-white/10">
              <tr>
                <th className="th">Customer</th>
                <th className="th">Vehicle</th>
                <th className="th">Dates</th>
                <th className="th">Total</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="td">
                    <p className="font-semibold text-white">{b.customer_name}</p>
                    <p className="text-xs text-white/40">{b.customer_email}</p>
                  </td>
                  <td className="td">
                    {b.brand} {b.vehicle_name}
                    <p className="text-xs text-white/40">{b.vehicle_number}</p>
                  </td>
                  <td className="td">
                    {fmtDate(b.start_date)} → {fmtDate(b.end_date)}
                    <p className="text-xs text-white/40">
                      {b.days} days · {b.duration_type}
                    </p>
                  </td>
                  <td className="td font-semibold text-brand">{inr(b.total_price)}</td>
                  <td className="td">
                    <StatusChip status={b.status} />
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-2">
                      {b.status === 'pending' && (
                        <>
                          <button
                            className="btn-brand !px-3 !py-1.5 !text-xs"
                            onClick={() => setBookingStatus(b, 'approved')}
                            disabled={busyId === `b${b.id}`}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-danger !px-3 !py-1.5 !text-xs"
                            onClick={() => setBookingStatus(b, 'rejected')}
                            disabled={busyId === `b${b.id}`}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {b.status === 'approved' && (
                        <button
                          className="btn-ghost !px-3 !py-1.5 !text-xs"
                          onClick={() => setBookingStatus(b, 'completed')}
                          disabled={busyId === `b${b.id}`}
                        >
                          Mark completed
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VehicleFormModal
        open={modal.open}
        initial={modal.vehicle}
        onClose={() => setModal({ open: false, vehicle: null })}
        onSaved={() => {
          setModal({ open: false, vehicle: null });
          setMessage({ type: 'ok', text: 'Saved. New listings go live after admin approval.' });
          load();
        }}
      />
    </div>
  );
}

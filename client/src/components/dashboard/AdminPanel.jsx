import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import StatusChip from '../StatusChip.jsx';
import { api } from '../../lib/api.js';
import { FALLBACK_IMG, fmtDate, inr, onImgError } from '../../lib/format.js';

function Kpi({ label, value, accent }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p className={`mt-1 font-display text-4xl ${accent ? 'text-brand' : 'text-white'}`}>{value}</p>
    </div>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState(null);
  const [users, setUsers] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [message, setMessage] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    Promise.all([
      api.get('/api/admin/stats'),
      api.get('/api/admin/vehicles'),
      api.get('/api/admin/users'),
      api.get('/api/admin/bookings'),
    ])
      .then(([s, v, u, b]) => {
        setStats(s);
        setVehicles(v.vehicles);
        setUsers(u.users);
        setBookings(b.bookings);
      })
      .catch((e) => setMessage(e.message));
  };
  useEffect(load, []);

  const pending = useMemo(() => (vehicles || []).filter((v) => v.status === 'pending'), [vehicles]);
  const maxMonthly = useMemo(() => Math.max(1, ...(stats?.monthly || []).map((m) => m.bookings)), [stats]);

  const moderate = async (v, status) => {
    setBusyId(v.id);
    setMessage(null);
    try {
      await api.patch(`/api/admin/vehicles/${v.id}/status`, { status });
      load();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleUser = async (u) => {
    setBusyId(`u${u.id}`);
    setMessage(null);
    try {
      await api.patch(`/api/admin/users/${u.id}/toggle`);
      load();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!stats || !vehicles || !users || !bookings) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand" size={28} />
      </div>
    );
  }

  const TABS = [
    ['overview', 'Overview'],
    ['approvals', `Approvals (${pending.length})`],
    ['users', `Users (${users.length})`],
    ['bookings', `Bookings (${bookings.length})`],
  ];

  return (
    <div className="space-y-6">
      <div className="flex w-fit flex-wrap gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {TABS.map(([key, lab]) => (
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

      {message && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{message}</div>
      )}

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Users" value={stats.totals.users} />
            <Kpi label="Vehicles" value={stats.totals.vehicles} />
            <Kpi label="Bookings" value={stats.totals.bookings} />
            <Kpi label="Confirmed revenue" value={inr(stats.totals.revenue)} accent />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Conversion rate" value={`${stats.kpis.conversionRate}%`} />
            <Kpi label="Utilization today" value={`${stats.kpis.utilizationToday}%`} />
            <Kpi label="Avg rental length" value={`${stats.kpis.avgRentalDays} days`} />
            <Kpi label="Pending approvals" value={stats.kpis.pendingApprovals} accent={stats.kpis.pendingApprovals > 0} />
          </div>

          <div className="card p-5">
            <p className="label !mb-4">Bookings — last 6 months</p>
            {stats.monthly.length === 0 ? (
              <p className="text-sm text-white/40">No booking activity yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.monthly.map((m) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs text-white/50">{m.month}</span>
                    <div className="h-6 flex-1 overflow-hidden rounded-md bg-white/5">
                      <div className="h-full rounded-md bg-brand/80" style={{ width: `${(m.bookings / maxMonthly) * 100}%` }} />
                    </div>
                    <span className="w-40 shrink-0 text-right text-xs text-white/55">
                      {m.bookings} bookings · {inr(m.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'approvals' && (
        <div className="space-y-6">
          {pending.length === 0 ? (
            <div className="card px-6 py-14 text-center">
              <p className="font-display text-3xl uppercase text-white/70">Queue is clear</p>
              <p className="mt-2 text-sm text-white/45">No listings waiting for review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {pending.map((v) => (
                <div key={v.id} className="card flex gap-4 p-4">
                  <img
                    src={v.image_url || FALLBACK_IMG}
                    onError={onImgError}
                    alt=""
                    className="h-24 w-32 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-2xl uppercase text-white">
                      {v.brand} {v.name}
                    </p>
                    <p className="text-xs text-white/45">
                      {v.type} · {v.fuel_type} · {v.model_year} · {v.vehicle_number}
                    </p>
                    <p className="mt-0.5 text-xs text-white/45">
                      {v.location} · by {v.agency_name} · {inr(v.price_daily)}/day
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="btn-brand !px-3 !py-1.5 !text-xs"
                        onClick={() => moderate(v, 'approved')}
                        disabled={busyId === v.id}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-danger !px-3 !py-1.5 !text-xs"
                        onClick={() => moderate(v, 'rejected')}
                        disabled={busyId === v.id}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="th">Vehicle</th>
                  <th className="th">Agency</th>
                  <th className="th">₹/day</th>
                  <th className="th">Listing</th>
                  <th className="th">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="td">
                      <span className="font-semibold text-white">
                        {v.brand} {v.name}
                      </span>
                      <p className="text-xs text-white/40">{v.vehicle_number}</p>
                    </td>
                    <td className="td">{v.agency_name}</td>
                    <td className="td">{inr(v.price_daily)}</td>
                    <td className="td">
                      <StatusChip status={v.status} />
                    </td>
                    <td className="td">
                      <StatusChip status={v.availability} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-white/10">
              <tr>
                <th className="th">User</th>
                <th className="th">Role</th>
                <th className="th">Joined</th>
                <th className="th">Bookings</th>
                <th className="th">Vehicles</th>
                <th className="th text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className={u.is_active ? '' : 'opacity-50'}>
                  <td className="td">
                    <p className="font-semibold text-white">{u.name}</p>
                    <p className="text-xs text-white/40">{u.email}</p>
                  </td>
                  <td className="td">
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
                      {u.role}
                    </span>
                  </td>
                  <td className="td">{u.created_at.slice(0, 10)}</td>
                  <td className="td">{u.bookings}</td>
                  <td className="td">{u.vehicles}</td>
                  <td className="td text-right">
                    {u.role === 'admin' ? (
                      <span className="text-xs text-white/30">—</span>
                    ) : (
                      <button
                        className={
                          u.is_active ? 'btn-danger !px-3 !py-1.5 !text-xs' : 'btn-brand !px-3 !py-1.5 !text-xs'
                        }
                        onClick={() => toggleUser(u)}
                        disabled={busyId === `u${u.id}`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-white/10">
              <tr>
                <th className="th">#</th>
                <th className="th">Customer</th>
                <th className="th">Vehicle</th>
                <th className="th">Agency</th>
                <th className="th">Dates</th>
                <th className="th">Total</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="td">{b.id}</td>
                  <td className="td">{b.customer_name}</td>
                  <td className="td">
                    {b.brand} {b.vehicle_name}
                    <p className="text-xs text-white/40">{b.vehicle_number}</p>
                  </td>
                  <td className="td">{b.agency_name}</td>
                  <td className="td">
                    {fmtDate(b.start_date)} → {fmtDate(b.end_date)}
                  </td>
                  <td className="td font-semibold text-brand">{inr(b.total_price)}</td>
                  <td className="td">
                    <StatusChip status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

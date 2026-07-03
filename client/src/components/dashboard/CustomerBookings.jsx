import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import StatusChip from '../StatusChip.jsx';
import { api } from '../../lib/api.js';
import { FALLBACK_IMG, fmtDate, inr, onImgError, todayISO } from '../../lib/format.js';

export default function CustomerBookings() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    api
      .get('/api/bookings/my')
      .then((d) => setBookings(d.bookings))
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const cancel = async (b) => {
    if (!window.confirm(`Cancel your booking for the ${b.brand} ${b.vehicle_name}?`)) return;
    setBusyId(b.id);
    setError('');
    try {
      await api.patch(`/api/bookings/${b.id}/cancel`);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!bookings) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {bookings.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-20 text-center">
          <p className="font-display text-4xl uppercase text-white/70">No bookings yet</p>
          <p className="mt-2 text-sm text-white/45">The fleet is waiting — pick your first ride.</p>
          <Link to="/fleet" className="btn-brand mt-6">
            Browse the fleet
          </Link>
        </div>
      ) : (
        bookings.map((b) => {
          // Pending requests can always be withdrawn; approved ones only before the trip starts.
          const cancellable = b.status === 'pending' || (b.status === 'approved' && b.start_date > todayISO());
          return (
            <div key={b.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <Link to={`/vehicles/${b.vehicle_id}`} className="block h-24 w-full shrink-0 overflow-hidden rounded-xl sm:w-36">
                <img
                  src={b.image_url || FALLBACK_IMG}
                  onError={onImgError}
                  alt={b.vehicle_name}
                  className="h-full w-full object-cover"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-2xl uppercase text-white">
                    {b.brand} {b.vehicle_name}
                  </p>
                  <StatusChip status={b.status} />
                </div>
                <p className="mt-1 text-sm text-white/55">
                  {fmtDate(b.start_date)} → {fmtDate(b.end_date)} · {b.days} day{b.days > 1 ? 's' : ''} ({b.duration_type})
                </p>
                <p className="mt-0.5 text-xs text-white/40">
                  {b.location} · {b.agency_name} · Booking #{b.id}
                </p>
              </div>
              <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                <p className="text-lg font-bold text-brand">{inr(b.total_price)}</p>
                {cancellable && (
                  <button className="btn-danger !px-3 !py-1.5 !text-xs" onClick={() => cancel(b)} disabled={busyId === b.id}>
                    {busyId === b.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

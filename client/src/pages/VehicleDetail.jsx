import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Fuel, Gauge, Loader2, MapPin, Users } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { estimate, FALLBACK_IMG, fmtDate, inr, onImgError, todayISO } from '../lib/format.js';

export default function VehicleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [durationType, setDurationType] = useState('daily');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/api/vehicles/${id}`)
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Shell>
        <div className="flex justify-center py-32">
          <Loader2 className="animate-spin text-brand" size={32} />
        </div>
      </Shell>
    );
  }

  if (notFound || !data) {
    return (
      <Shell>
        <div className="py-24 text-center">
          <p className="font-display text-6xl uppercase text-white/70">Vehicle not found</p>
          <Link to="/fleet" className="btn-brand mt-6 inline-flex">
            Back to the fleet
          </Link>
        </div>
      </Shell>
    );
  }

  const { vehicle: v, bookedRanges } = data;
  const est = estimate(v, start, end, durationType);
  const bookable = v.status === 'approved' && v.availability === 'available';

  const book = async () => {
    setBooking(true);
    setError('');
    try {
      const d = await api.post('/api/bookings', {
        vehicle_id: v.id,
        start_date: start,
        end_date: end,
        duration_type: durationType,
      });
      setSuccess(d.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  };

  const specs = [
    { icon: CalendarDays, label: 'Year', value: v.model_year },
    { icon: Fuel, label: 'Fuel', value: v.fuel_type },
    { icon: Gauge, label: 'Gearbox', value: v.transmission },
    { icon: Users, label: 'Seats', value: v.seats },
    { icon: MapPin, label: 'Location', value: v.location },
  ];

  return (
    <Shell>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_1fr]">
        {/* -------- left: media + facts -------- */}
        <div>
          <div className="card overflow-hidden">
            <img
              src={v.image_url || FALLBACK_IMG}
              onError={onImgError}
              alt={`${v.brand} ${v.name}`}
              className="aspect-[16/10] w-full object-cover"
            />
          </div>

          <div className="mt-6">
            <h1 className="font-display uppercase leading-[0.9] text-white" style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>
              {v.brand} <span className="text-brand">{v.name}</span>
            </h1>
            <p className="mt-1 text-sm text-white/50">
              {v.type === '2W' ? '2-Wheeler' : '4-Wheeler'} · Reg. {v.vehicle_number} · Listed by {v.agency_name}
            </p>
            {v.description && <p className="mt-4 max-w-2xl leading-relaxed text-white/70">{v.description}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {specs.map((s) => (
                <div key={s.label} className="card flex flex-col items-start gap-1.5 p-3">
                  <s.icon size={16} className="text-brand" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">{s.label}</span>
                  <span className="text-sm font-semibold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* -------- right: pricing + booking -------- */}
        <div className="space-y-5">
          <div className="card p-5">
            <p className="label !mb-3">Pricing tiers</p>
            <div className="divide-y divide-white/10">
              {[
                ['Daily', v.price_daily, 'per day'],
                ['Weekly', v.price_weekly, 'per week'],
                ['Monthly', v.price_monthly, 'per month'],
              ].map(([t, p, sub]) => (
                <div key={t} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-white/70">{t}</span>
                  <span className="text-right">
                    <span className="font-bold text-brand">{inr(p)}</span>
                    <span className="ml-1 text-xs text-white/40">{sub}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 lg:sticky lg:top-24">
            <p className="label !mb-3">Book this vehicle</p>

            {!bookable && (
              <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
                This vehicle is currently{' '}
                {v.availability === 'maintenance' ? 'blocked for maintenance' : 'not open for bookings'}.
              </div>
            )}

            {bookedRanges.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs text-white/45">Already reserved:</p>
                <div className="flex flex-wrap gap-1.5">
                  {bookedRanges.map((r, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-200"
                    >
                      {fmtDate(r.start_date)} → {fmtDate(r.end_date)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {success ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 size={18} />
                  <p className="font-semibold">Request sent!</p>
                </div>
                <p className="mt-1.5 text-sm text-emerald-200/80">
                  Booking #{success.id} · {fmtDate(success.start_date)} → {fmtDate(success.end_date)} ·{' '}
                  {inr(success.total_price)}. The agency will confirm shortly.
                </p>
                <Link to="/dashboard" className="btn-brand mt-4 w-full">
                  Track it in your dashboard
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="label">Pick-up</span>
                    <input
                      type="date"
                      className="input"
                      min={todayISO()}
                      value={start}
                      onChange={(e) => {
                        setStart(e.target.value);
                        setError('');
                      }}
                    />
                  </label>
                  <label className="block">
                    <span className="label">Return</span>
                    <input
                      type="date"
                      className="input"
                      min={start || todayISO()}
                      value={end}
                      onChange={(e) => {
                        setEnd(e.target.value);
                        setError('');
                      }}
                    />
                  </label>
                  <label className="col-span-2 block">
                    <span className="label">Billing plan</span>
                    <select className="input" value={durationType} onChange={(e) => setDurationType(e.target.value)}>
                      <option value="daily">Daily — {inr(v.price_daily)}/day</option>
                      <option value="weekly">Weekly — {inr(v.price_weekly)}/week</option>
                      <option value="monthly">Monthly — {inr(v.price_monthly)}/month</option>
                    </select>
                  </label>
                </div>

                {est && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">
                        {est.days} day{est.days > 1 ? 's' : ''} · billed as {est.units} {est.unitLabel}
                        {est.units > 1 ? 's' : ''}
                      </span>
                      <span className="text-lg font-bold text-brand">{inr(est.total)}</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {!user ? (
                  <button
                    className="btn-brand mt-4 w-full"
                    onClick={() => navigate(`/login?next=${encodeURIComponent(`/vehicles/${v.id}`)}`)}
                  >
                    Sign in to book
                  </button>
                ) : user.role !== 'customer' ? (
                  <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
                    You're signed in as {user.role} — only customer accounts can place bookings.
                  </p>
                ) : (
                  <button className="btn-brand mt-4 w-full" onClick={book} disabled={!est || booking || !bookable}>
                    {booking && <Loader2 size={15} className="animate-spin" />}
                    {est ? `Request booking · ${inr(est.total)}` : 'Pick your dates'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bike, Building2, Loader2 } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: sp.get('role') === 'agency' ? 'agency' : 'customer',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const roles = [
    { value: 'customer', icon: Bike, title: 'Rent vehicles', desc: 'Browse the fleet and book rides' },
    { value: 'agency', icon: Building2, title: 'List my fleet', desc: 'Manage vehicles and bookings' },
  ];

  return (
    <Shell>
      <div className="mx-auto max-w-md py-8">
        <h1 className="font-display text-6xl uppercase text-white">
          Get <span className="text-brand">started</span>
        </h1>
        <p className="mt-2 text-sm text-white/50">One account, whichever side of the keys you're on.</p>

        <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                className={`rounded-xl border p-3.5 text-left transition ${
                  form.role === r.value ? 'border-brand bg-brand/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                }`}
              >
                <r.icon size={18} className={form.role === r.value ? 'text-brand' : 'text-white/50'} />
                <p className="mt-2 text-sm font-semibold text-white">{r.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/45">{r.desc}</p>
              </button>
            ))}
          </div>

          <div>
            <label className="label">{form.role === 'agency' ? 'Agency name' : 'Full name'}</label>
            <input
              className="input"
              value={form.name}
              onChange={set('name')}
              placeholder={form.role === 'agency' ? 'HillRide Rentals' : 'Hitesh Kumar'}
              required
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>

          <button className="btn-brand w-full" disabled={busy}>
            {busy && <Loader2 size={15} className="animate-spin" />} Create account
          </button>
          <p className="text-center text-sm text-white/50">
            Already registered?{' '}
            <Link to="/login" className="text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </Shell>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(sp.get('next') || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-md py-8">
        <h1 className="font-display text-6xl uppercase text-white">
          Sign <span className="text-brand">in</span>
        </h1>
        <p className="mt-2 text-sm text-white/50">Welcome back — your next ride is waiting.</p>

        <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
          )}
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn-brand w-full" disabled={busy}>
            {busy && <Loader2 size={15} className="animate-spin" />} Sign in
          </button>
          <p className="text-center text-sm text-white/50">
            New here?{' '}
            <Link to="/register" className="text-brand hover:underline">
              Create an account
            </Link>
          </p>
        </form>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-white/40">
          <span className="font-semibold text-white/60">Demo accounts</span> — admin@rentigo.com / admin123 ·
          agency@rentigo.com / agency123 · rider@rentigo.com / rider123
        </div>
      </div>
    </Shell>
  );
}

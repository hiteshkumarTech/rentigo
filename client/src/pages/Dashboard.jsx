import Shell from '../components/Shell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import CustomerBookings from '../components/dashboard/CustomerBookings.jsx';
import AgencyPanel from '../components/dashboard/AgencyPanel.jsx';
import AdminPanel from '../components/dashboard/AdminPanel.jsx';

const SUBTITLES = {
  customer: 'Your bookings, all in one place.',
  agency: 'Your fleet, your bookings, your call.',
  admin: 'Everything happening on the platform.',
};

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-display uppercase leading-[0.85] text-white" style={{ fontSize: 'clamp(48px, 8vw, 96px)' }}>
          Dash<span className="text-brand">board</span>
        </h1>
        <p className="mt-2 text-sm text-white/50">
          {user.name} · <span className="uppercase tracking-wider text-brand">{user.role}</span> — {SUBTITLES[user.role]}
        </p>
      </div>

      {user.role === 'customer' && <CustomerBookings />}
      {user.role === 'agency' && <AgencyPanel />}
      {user.role === 'admin' && <AdminPanel />}
    </Shell>
  );
}

import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `text-sm transition ${isActive ? 'text-brand' : 'text-white/70 hover:text-white'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="font-display text-[26px] uppercase leading-none tracking-tight text-white">
          RENTI<span className="text-brand">GO</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <NavLink to="/fleet" className={linkClass}>
            Fleet
          </NavLink>
          {user && (
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="text-sm text-white/60">
                Hi, <span className="text-white">{user.name.split(' ')[0]}</span>
                <span className="ml-2 rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/50">
                  {user.role}
                </span>
              </span>
              <button onClick={handleLogout} className="btn-ghost !px-3 !py-1.5">
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-white/70 hover:text-white">
                Sign in
              </Link>
              <Link to="/register" className="btn-brand !px-4 !py-2">
                Get started
              </Link>
            </>
          )}
        </div>

        <button className="text-white md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-night px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link to="/fleet" onClick={() => setOpen(false)} className="text-white/80">
              Fleet
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="text-white/80">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="text-left text-white/80">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="text-white/80">
                  Sign in
                </Link>
                <Link to="/register" onClick={() => setOpen(false)} className="text-brand">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

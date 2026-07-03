import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Protected from './components/Protected.jsx';
import Shell from './components/Shell.jsx';
import Home from './pages/Home.jsx';
import Fleet from './pages/Fleet.jsx';
import VehicleDetail from './pages/VehicleDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function NotFound() {
  return (
    <Shell>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-display text-8xl uppercase text-brand">404</p>
        <p className="mt-2 text-white/60">That road doesn't exist.</p>
        <Link to="/" className="btn-brand mt-6">
          Back to home
        </Link>
      </div>
    </Shell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/vehicles/:id" element={<VehicleDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

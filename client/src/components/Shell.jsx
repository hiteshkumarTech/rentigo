import Navbar from './Navbar.jsx';

export default function Shell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-night">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/30">
        © 2026 RentiGo — rent it, ride it, return it.
      </footer>
    </div>
  );
}

import { Github, Linkedin } from 'lucide-react';
import Navbar from './Navbar.jsx';

export default function Shell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-night">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">{children}</main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/hiteshkumarTech/rentigo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-white/50 transition hover:text-brand"
            >
              <Github size={16} /> Source
            </a>
            <a
              href="https://linkedin.com/in/hitesh-kumar-Ob7702416"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-white/50 transition hover:text-brand"
            >
              <Linkedin size={16} /> LinkedIn
            </a>
          </div>
          <p className="text-center text-xs text-white/30">
            Designed &amp; built by <span className="font-medium text-white/60">Hitesh Kumar</span>
            <span className="mx-2 text-white/15">·</span>
            © 2026 RentiGo — rent it, ride it, return it.
          </p>
        </div>
      </footer>
    </div>
  );
}
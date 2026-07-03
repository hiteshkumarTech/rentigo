import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Car, ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { EXPO_OUT, todayISO } from '../lib/format.js';
import PillButton from '../components/PillButton.jsx';

const NAV = [
  { label: 'Fleet', to: '/fleet' },
  { label: 'Pricing', to: '/fleet?sort=price_asc' },
  { label: 'For agencies', to: '/register?role=agency' },
];

/* Giant headline line — slides in from ±900px with EXPO_OUT (per spec). */
function HeadlineLine({ text, from, delay, color, ml }) {
  return (
    <motion.div
      initial={{ x: from, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.85, delay, ease: EXPO_OUT }}
      className="font-display uppercase"
      style={{
        fontSize: 'clamp(86px, min(14vh, 11vw), 220px)',
        lineHeight: 0.78,
        letterSpacing: '-0.01em',
        color,
        marginLeft: ml,
      }}
    >
      {text}
    </motion.div>
  );
}

/* Word-by-word tagline reveal — y:100% + rotateX:45, 0.08s stagger (per spec). */
function RevealLine({ text, delay, ml }) {
  const words = text.split(' ');
  return (
    <div className="flex flex-wrap" style={{ marginLeft: ml, columnGap: '0.28em' }}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.1em]">
          <motion.span
            className="inline-block"
            initial={{ y: '100%', rotateX: 45, opacity: 0 }}
            animate={{ y: 0, rotateX: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: EXPO_OUT, delay: delay + i * 0.08 }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </div>
  );
}

/* The rental-product signature that replaces the spec's shipping map:
   a live-availability search that deep-links into /fleet with filters. */
function SearchCard() {
  const navigate = useNavigate();
  const [type, setType] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const submit = () => {
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    if (start && end && start <= end) {
      p.set('start', start);
      p.set('end', end);
    }
    navigate(`/fleet?${p.toString()}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.95, type: 'spring', stiffness: 220, damping: 20 }}
      className="rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-md sm:p-5"
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">Find a ride</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block">
          <span className="label">Vehicle type</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Any type</option>
            <option value="2W">2-Wheeler</option>
            <option value="4W">4-Wheeler</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Pick-up</span>
          <input type="date" className="input" min={todayISO()} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Return</span>
          <input
            type="date"
            className="input"
            min={start || todayISO()}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>
      <button onClick={submit} className="btn-brand mt-3 w-full">
        Search available vehicles <ArrowRight size={16} />
      </button>
      <p className="mt-3 text-xs leading-relaxed text-white/50">
        Live availability across the partner fleet — vehicles with clashing bookings are filtered out automatically.
      </p>
    </motion.div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* The spec gates all content on the video's canplay — but that blanks the page
     if the asset ever dies. onError + a safety timeout keep the hero alive on the
     designed gradient instead. Drop a file at client/public/hero.mp4 to enable video. */
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(t);
  }, []);

  const authItem = user ? { label: 'Dashboard', to: '/dashboard' } : { label: 'Sign in', to: '/login' };

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-clip bg-[#1a1a2e] lg:h-[100dvh] lg:overflow-hidden">
      {/* Optional background video (auto-detected from /hero.mp4). */}
      <video
        className="absolute inset-0 z-0 h-full w-full object-cover"
        src="/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
        onCanPlay={() => setReady(true)}
        onError={() => setReady(true)}
      />

      {/* Designed background + readability scrim (visible through / without the video). */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#07131a] via-[#0b2530]/85 to-ink/95" />
      <div
        className="pointer-events-none absolute -left-40 top-[-20%] z-0 h-[70vh] w-[70vh] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #ffda00 0%, transparent 65%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-30%] right-[-10%] z-0 h-[80vh] w-[80vh] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #0e6079 0%, transparent 60%)' }}
      />

      <AnimatePresence>
        {ready && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex w-full flex-1 flex-col"
          >
            {/* ------------------------------ header ------------------------------ */}
            <header
              className="relative z-50 flex items-start justify-between"
              style={{ padding: 'clamp(16px, 4vh, 40px) clamp(16px, 3vw, 48px) 0' }}
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EXPO_OUT }}
              >
                <Link
                  to="/"
                  className="block font-display uppercase"
                  style={{
                    fontSize: 'clamp(22px, min(3.15vh, 2.32vw), 32px)',
                    lineHeight: 0.9,
                    letterSpacing: '-0.01em',
                  }}
                >
                  <span className="block text-white">RENTI</span>
                  <span className="block text-brand">GO</span>
                </Link>
              </motion.div>

              <nav className="hidden items-center md:flex" style={{ gap: 'clamp(20px, 3.8vw, 52px)' }}>
                {NAV.map((item, i) => (
                  <motion.button
                    key={item.label}
                    onClick={() => navigate(item.to)}
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 + i * 0.1, ease: EXPO_OUT }}
                    whileHover={{ x: 2, color: '#ffda00' }}
                    className="flex items-center gap-1.5 text-white"
                    style={{ fontSize: 'clamp(15px, min(1.97vh, 1.45vw), 20px)', letterSpacing: '-0.02em' }}
                  >
                    {item.label}
                    <ChevronDown size={15} />
                  </motion.button>
                ))}
                <motion.button
                  onClick={() => navigate(authItem.to)}
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 + NAV.length * 0.1, ease: EXPO_OUT }}
                  whileHover={{ x: 2 }}
                  className="text-brand"
                  style={{ fontSize: 'clamp(15px, min(1.97vh, 1.45vw), 20px)', letterSpacing: '-0.02em' }}
                >
                  {authItem.label}
                </motion.button>
              </nav>

              <button className="text-white md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
                {menuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </header>

            {/* -------------------------- mobile overlay -------------------------- */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-ink/95 backdrop-blur md:hidden"
                >
                  {[...NAV, authItem].map((item, i) => (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 * i }}
                      className="text-2xl text-white"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate(item.to);
                      }}
                    >
                      {item.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ------------------------------- main ------------------------------- */}
            <main
              className="relative z-10 grid flex-1 grid-cols-1 items-start lg:grid-cols-[2.17fr_1fr]"
              style={{ padding: 'clamp(24px, 8vh, 120px) clamp(16px, 3vw, 48px) 0', gap: 'clamp(20px, 4vh, 48px)' }}
            >
              <div style={{ overflow: 'clip' }}>
                <HeadlineLine text="DRIVE" from={-900} delay={0} color="#ffffff" />
                <HeadlineLine text="BEYOND" from={900} delay={0.13} color="#ffda00" ml="0.524em" />
                <HeadlineLine text="LIMITS" from={-900} delay={0.26} color="#ffffff" />
              </div>

              <div className="flex flex-col pb-6 lg:pb-0" style={{ gap: 'clamp(16px, 2.66vh, 32px)' }}>
                <div
                  className="font-display uppercase text-[#dff3f4]"
                  style={{ fontSize: 'clamp(24px, min(4vh, 3vw), 52px)', lineHeight: 0.9, letterSpacing: '-0.02em' }}
                >
                  <RevealLine text="Wheels" delay={0.3} />
                  <RevealLine text="for every journey" delay={0.5} ml="1.5em" />
                  <RevealLine text="priced your way" delay={0.7} />
                </div>
                <SearchCard />
              </div>
            </main>

            {/* ------------------------------ footer ------------------------------ */}
            <footer
              className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
              style={{ padding: 'clamp(12px, 3vh, 32px) clamp(16px, 3vw, 48px) clamp(16px, 5vh, 66px)' }}
            >
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.65, ease: EXPO_OUT }}
                className="flex items-end gap-4"
              >
                <div
                  className="font-display uppercase text-brand"
                  style={{ fontSize: 'clamp(52px, min(8vh, 6vw), 98px)', lineHeight: 0.85 }}
                >
                  1M+
                </div>
                <div className="flex items-center gap-3 pb-1">
                  <p className="text-white" style={{ fontSize: 'clamp(16px, min(1.6vh, 1.2vw), 20px)', lineHeight: 1.25 }}>
                    kilometres driven
                    <br />
                    by RentiGo riders —
                    <br />
                    zero double-bookings
                  </p>
                  <div
                    className="flex items-center justify-center rounded-full bg-white"
                    style={{ width: 'clamp(40px, min(5.5vh, 4vw), 67px)', aspectRatio: '1' }}
                  >
                    <Car className="text-ink" size={22} />
                  </div>
                </div>
              </motion.div>

              <PillButton label="Get riding" onClick={() => navigate('/fleet')} />
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

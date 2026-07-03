import { motion } from 'motion/react';
import { EXPO_OUT } from '../lib/format.js';

/**
 * Pill + ring geometry from the CARGOX spec (viewBox 0 0 434.001 68):
 * a rounded pill body ending at x=346, and a ring centred at x≈400.93
 * whose middle is punched out (even-odd fill) so the arrow sits on the
 * page background inside it.
 */
const PILL_PATH = [
  'M34 0 H312 A34 34 0 0 1 312 68 H34 A34 34 0 0 1 34 0 Z',
  'M400.93 0.93 A33.07 33.07 0 1 0 400.93 67.07 A33.07 33.07 0 1 0 400.93 0.93 Z',
  'M400.93 3.37 A30.63 30.63 0 1 1 400.93 64.63 A30.63 30.63 0 1 1 400.93 3.37 Z',
].join(' ');

export default function PillButton({ label = 'Get riding', onClick, delay = 0.5 }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: EXPO_OUT }}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="group relative block h-14 w-full shrink-0 sm:h-[clamp(48px,min(6vh,4.5vw),68px)] sm:w-auto sm:aspect-[434/68]"
      aria-label={label}
    >
      <svg
        viewBox="0 0 434.001 68"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path d={PILL_PATH} fill="#ffda00" fillRule="evenodd" />
      </svg>

      <span
        className="absolute left-0 top-0 flex h-full w-[79.7%] items-center justify-center font-bold text-ink"
        style={{ fontSize: 'clamp(14px, min(1.6vh, 1.2vw), 20px)' }}
      >
        {label}
      </span>

      {/* Arrow: -135° at rest → -90° on hover, 350ms (per spec). */}
      <span
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-135deg] transition-transform duration-[350ms] group-hover:rotate-[-90deg]"
        style={{ left: '92.38%' }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 16.89 20.37" className="h-auto w-[clamp(13px,1.1vw,17px)]" fill="none">
          <path
            d="M8.445 1.2v16.4M1.7 11.2l6.745 7.4 6.745-7.4"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </motion.button>
  );
}

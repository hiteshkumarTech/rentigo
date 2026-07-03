const STYLES = {
  pending: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
  approved: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
  rejected: 'bg-red-400/10 text-red-300 border-red-400/30',
  cancelled: 'bg-white/5 text-white/50 border-white/15',
  completed: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
  available: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
  maintenance: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
};

export default function StatusChip({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
        STYLES[status] || STYLES.cancelled
      }`}
    >
      {status}
    </span>
  );
}

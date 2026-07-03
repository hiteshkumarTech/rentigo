// Shared easing from the design spec.
export const EXPO_OUT = [0.16, 1, 0.3, 1];

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export const fmtDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const pad = (n) => String(n).padStart(2, '0');
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Client-side mirror of the server's pricing (display only — the server
 * recomputes the authoritative total on every booking).
 */
export function estimate(vehicle, start, end, durationType) {
  if (!vehicle || !start || !end || end < start) return null;
  const days =
    Math.round((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / 86_400_000) + 1;
  if (days < 1 || days > 180) return null;

  if (durationType === 'daily') return { days, units: days, unitLabel: 'day', total: days * vehicle.price_daily };
  if (durationType === 'weekly') {
    const units = Math.ceil(days / 7);
    return { days, units, unitLabel: 'week', total: units * vehicle.price_weekly };
  }
  const units = Math.ceil(days / 30);
  return { days, units, unitLabel: 'month', total: units * vehicle.price_monthly };
}

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f2831"/><stop offset="1" stop-color="#002a35"/></linearGradient></defs><rect width="900" height="600" fill="url(#g)"/><text x="50%" y="53%" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="rgba(255,218,0,0.25)" text-anchor="middle" letter-spacing="6">RENTIGO</text></svg>`;

export const FALLBACK_IMG = `data:image/svg+xml;utf8,${encodeURIComponent(FALLBACK_SVG)}`;

// Swap broken/missing vehicle photos for a branded placeholder instead of a broken-image icon.
export const onImgError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FALLBACK_IMG;
};

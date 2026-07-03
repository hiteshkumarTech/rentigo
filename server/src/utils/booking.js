const db = require('../db');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;
const MAX_RENTAL_DAYS = 180;

function isValidDate(s) {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Inclusive day count: 2026-07-10 → 2026-07-10 is 1 day. */
function daysBetween(start, end) {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  return Math.round((e - s) / MS_PER_DAY) + 1;
}

/**
 * Authoritative price calculation — the server never trusts a client-sent total.
 * weekly/monthly bill in whole units (ceil), matching how real rental desks quote.
 */
function computePrice(vehicle, startDate, endDate, durationType) {
  const days = daysBetween(startDate, endDate);
  if (days < 1 || days > MAX_RENTAL_DAYS) return null;

  switch (durationType) {
    case 'daily':
      return { days, units: days, total: days * vehicle.price_daily };
    case 'weekly': {
      const units = Math.ceil(days / 7);
      return { days, units, total: units * vehicle.price_weekly };
    }
    case 'monthly': {
      const units = Math.ceil(days / 30);
      return { days, units, total: units * vehicle.price_monthly };
    }
    default:
      return null;
  }
}

/**
 * Date-range overlap check against blocking bookings.
 * Two ranges overlap unless one ends before the other starts.
 */
function hasConflict(vehicleId, startDate, endDate, { statuses = ['pending', 'approved'], excludeBookingId = null } = {}) {
  const placeholders = statuses.map(() => '?').join(',');
  // Overlap unless the existing booking ends before the new one starts,
  // or starts after the new one ends → bind (newStart, newEnd) in that order.
  const params = [vehicleId, ...statuses, startDate, endDate];
  let sql = `
    SELECT COUNT(*) AS c FROM bookings
    WHERE vehicle_id = ?
      AND status IN (${placeholders})
      AND NOT (end_date < ? OR start_date > ?)
  `;
  if (excludeBookingId != null) {
    sql += ' AND id != ?';
    params.push(excludeBookingId);
  }
  return db.prepare(sql).get(...params).c > 0;
}

module.exports = { isValidDate, todayISO, daysBetween, computePrice, hasConflict, MAX_RENTAL_DAYS };

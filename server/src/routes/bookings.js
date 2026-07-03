const express = require('express');
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const { isValidDate, todayISO, computePrice, hasConflict, MAX_RENTAL_DAYS } = require('../utils/booking');

const router = express.Router();

/* --------------------------------- customer -------------------------------- */

// POST /api/bookings — customer requests a rental. Price is computed server-side.
router.post('/', auth, requireRole('customer'), (req, res) => {
  const { vehicle_id, start_date, end_date, duration_type } = req.body || {};

  if (!isValidDate(start_date) || !isValidDate(end_date)) {
    return res.status(400).json({ error: 'Dates must be valid YYYY-MM-DD values' });
  }
  if (start_date < todayISO()) {
    return res.status(400).json({ error: 'Start date cannot be in the past' });
  }
  if (end_date < start_date) {
    return res.status(400).json({ error: 'End date must be on or after the start date' });
  }
  if (!['daily', 'weekly', 'monthly'].includes(duration_type)) {
    return res.status(400).json({ error: 'duration_type must be daily, weekly or monthly' });
  }

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
  if (!vehicle || vehicle.status !== 'approved' || vehicle.availability !== 'available') {
    return res.status(404).json({ error: 'This vehicle is not available for booking' });
  }

  if (hasConflict(vehicle.id, start_date, end_date)) {
    return res.status(409).json({
      error: 'Those dates clash with an existing booking for this vehicle. Pick a different window.',
    });
  }

  const pricing = computePrice(vehicle, start_date, end_date, duration_type);
  if (!pricing) {
    return res.status(400).json({ error: `Rental length must be between 1 and ${MAX_RENTAL_DAYS} days` });
  }

  const result = db
    .prepare(
      `INSERT INTO bookings (vehicle_id, customer_id, start_date, end_date, duration_type, days, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(vehicle.id, req.user.id, start_date, end_date, duration_type, pricing.days, pricing.total);

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ booking, message: 'Booking requested — the agency will confirm shortly' });
});

// GET /api/bookings/my — customer's booking history.
router.get('/my', auth, requireRole('customer'), (req, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, v.name AS vehicle_name, v.brand, v.type, v.image_url, v.location,
              u.name AS agency_name
         FROM bookings b
         JOIN vehicles v ON v.id = b.vehicle_id
         JOIN users u    ON u.id = v.agency_id
        WHERE b.customer_id = ?
        ORDER BY b.created_at DESC`
    )
    .all(req.user.id);
  res.json({ bookings: rows });
});

// PATCH /api/bookings/:id/cancel — customer cancels a pending, or an approved trip that hasn't started.
router.patch('/:id/cancel', auth, requireRole('customer'), (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking || booking.customer_id !== req.user.id) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  const cancellable =
    booking.status === 'pending' || (booking.status === 'approved' && booking.start_date > todayISO());
  if (!cancellable) {
    return res.status(400).json({ error: 'Only pending bookings, or approved trips that haven\'t started, can be cancelled' });
  }
  db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(booking.id);
  res.json({ booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id) });
});

/* ---------------------------------- agency --------------------------------- */

// GET /api/bookings/agency — every booking against the agency's fleet.
router.get('/agency', auth, requireRole('agency'), (req, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, v.name AS vehicle_name, v.brand, v.type, v.vehicle_number, v.image_url,
              c.name AS customer_name, c.email AS customer_email
         FROM bookings b
         JOIN vehicles v ON v.id = b.vehicle_id
         JOIN users c    ON c.id = b.customer_id
        WHERE v.agency_id = ?
        ORDER BY b.created_at DESC`
    )
    .all(req.user.id);
  res.json({ bookings: rows });
});

// PATCH /api/bookings/:id/status — agency approves / rejects / completes.
router.patch('/:id/status', auth, requireRole('agency'), (req, res) => {
  const { status } = req.body || {};

  const booking = db
    .prepare(
      `SELECT b.*, v.agency_id FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id WHERE b.id = ?`
    )
    .get(req.params.id);

  if (!booking || booking.agency_id !== req.user.id) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const allowed = {
    pending: ['approved', 'rejected'],
    approved: ['completed'],
  };
  if (!allowed[booking.status]?.includes(status)) {
    return res.status(400).json({ error: `A ${booking.status} booking cannot become ${status || 'that status'}` });
  }

  // Re-verify at approval time: two pending requests can hold overlapping dates,
  // but only one may ever be approved for the same window.
  if (status === 'approved') {
    const clash = hasConflict(booking.vehicle_id, booking.start_date, booking.end_date, {
      statuses: ['approved'],
      excludeBookingId: booking.id,
    });
    if (clash) {
      return res.status(409).json({
        error: 'An approved booking already covers these dates. Reject this request or resolve the other booking first.',
      });
    }
  }

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, booking.id);
  res.json({ booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id) });
});

module.exports = router;

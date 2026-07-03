const express = require('express');
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const { todayISO } = require('../utils/booking');

const router = express.Router();
router.use(auth, requireRole('admin'));

// GET /api/admin/stats — the KPI set from the PRD.
router.get('/stats', (req, res) => {
  const count = (sql, ...p) => db.prepare(sql).get(...p).c;
  const today = todayISO();

  const usersByRole = db.prepare('SELECT role, COUNT(*) AS c FROM users GROUP BY role').all();
  const vehiclesByStatus = db.prepare('SELECT status, COUNT(*) AS c FROM vehicles GROUP BY status').all();
  const bookingsByStatus = db.prepare('SELECT status, COUNT(*) AS c FROM bookings GROUP BY status').all();

  const totalBookings = count('SELECT COUNT(*) AS c FROM bookings');
  const confirmedBookings = count(`SELECT COUNT(*) AS c FROM bookings WHERE status IN ('approved','completed')`);
  const revenue =
    db.prepare(`SELECT COALESCE(SUM(total_price), 0) AS s FROM bookings WHERE status IN ('approved','completed')`).get().s;

  const approvedVehicles = count(`SELECT COUNT(*) AS c FROM vehicles WHERE status = 'approved'`);
  const rentedToday = count(
    `SELECT COUNT(DISTINCT vehicle_id) AS c FROM bookings
      WHERE status = 'approved' AND start_date <= ? AND end_date >= ?`,
    today,
    today
  );

  const avgDuration = db
    .prepare(`SELECT COALESCE(AVG(days), 0) AS a FROM bookings WHERE status IN ('approved','completed')`)
    .get().a;

  // Last 6 calendar months of booking volume + confirmed revenue.
  const monthly = db
    .prepare(
      `SELECT strftime('%Y-%m', created_at) AS month,
              COUNT(*) AS bookings,
              COALESCE(SUM(CASE WHEN status IN ('approved','completed') THEN total_price END), 0) AS revenue
         FROM bookings
        WHERE created_at >= date('now', '-6 months')
        GROUP BY month
        ORDER BY month ASC`
    )
    .all();

  res.json({
    usersByRole,
    vehiclesByStatus,
    bookingsByStatus,
    totals: {
      users: count('SELECT COUNT(*) AS c FROM users'),
      vehicles: count('SELECT COUNT(*) AS c FROM vehicles'),
      bookings: totalBookings,
      revenue,
    },
    kpis: {
      conversionRate: totalBookings ? Math.round((confirmedBookings / totalBookings) * 100) : 0,
      utilizationToday: approvedVehicles ? Math.round((rentedToday / approvedVehicles) * 100) : 0,
      avgRentalDays: Math.round(avgDuration * 10) / 10,
      pendingApprovals: count(`SELECT COUNT(*) AS c FROM vehicles WHERE status = 'pending'`),
    },
    monthly,
  });
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
              (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id) AS bookings,
              (SELECT COUNT(*) FROM vehicles v WHERE v.agency_id = u.id) AS vehicles
         FROM users u
        ORDER BY u.created_at DESC`
    )
    .all();
  res.json({ users: rows });
});

// PATCH /api/admin/users/:id/toggle — activate / deactivate an account.
router.patch('/users/:id/toggle', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot deactivate your own account' });
  if (user.role === 'admin') return res.status(400).json({ error: 'Admin accounts cannot be deactivated here' });

  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(user.is_active ? 0 : 1, user.id);
  res.json({ user: db.prepare('SELECT id, name, email, role, is_active FROM users WHERE id = ?').get(user.id) });
});

// GET /api/admin/vehicles — all listings (optionally ?status=pending) for moderation.
router.get('/vehicles', (req, res) => {
  const { status } = req.query;
  const where = ['pending', 'approved', 'rejected'].includes(status) ? 'WHERE v.status = ?' : '';
  const params = where ? [status] : [];
  const rows = db
    .prepare(
      `SELECT v.*, u.name AS agency_name, u.email AS agency_email
         FROM vehicles v JOIN users u ON u.id = v.agency_id
        ${where}
        ORDER BY v.created_at DESC`
    )
    .all(...params);
  res.json({ vehicles: rows });
});

// PATCH /api/admin/vehicles/:id/status — approve or reject a listing.
router.patch('/vehicles/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' });
  }
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  db.prepare('UPDATE vehicles SET status = ? WHERE id = ?').run(status, vehicle.id);
  res.json({ vehicle: db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle.id) });
});

// GET /api/admin/bookings — platform-wide bookings monitor.
router.get('/bookings', (req, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, v.name AS vehicle_name, v.brand, v.vehicle_number,
              c.name AS customer_name, a.name AS agency_name
         FROM bookings b
         JOIN vehicles v ON v.id = b.vehicle_id
         JOIN users c    ON c.id = b.customer_id
         JOIN users a    ON a.id = v.agency_id
        ORDER BY b.created_at DESC`
    )
    .all();
  res.json({ bookings: rows });
});

module.exports = router;

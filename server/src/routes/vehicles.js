const express = require('express');
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const { isValidDate, todayISO } = require('../utils/booking');

const router = express.Router();

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];
const TRANSMISSIONS = ['Manual', 'Automatic'];

/* ------------------------------ public catalog ----------------------------- */

// GET /api/vehicles — approved & available vehicles with search / filter / sort.
// Optional ?start=YYYY-MM-DD&end=YYYY-MM-DD excludes vehicles already booked for that window.
router.get('/', (req, res) => {
  const { type, fuel, minPrice, maxPrice, search, location, sort, start, end } = req.query;

  const where = ["v.status = 'approved'", "v.availability = 'available'"];
  const params = [];

  if (type === '2W' || type === '4W') {
    where.push('v.type = ?');
    params.push(type);
  }
  if (fuel && FUEL_TYPES.includes(fuel)) {
    where.push('v.fuel_type = ?');
    params.push(fuel);
  }
  if (minPrice && Number(minPrice) >= 0) {
    where.push('v.price_daily >= ?');
    params.push(Number(minPrice));
  }
  if (maxPrice && Number(maxPrice) > 0) {
    where.push('v.price_daily <= ?');
    params.push(Number(maxPrice));
  }
  if (location && typeof location === 'string') {
    where.push('v.location LIKE ?');
    params.push(`%${location.trim()}%`);
  }
  if (search && typeof search === 'string' && search.trim()) {
    where.push('(v.name LIKE ? OR v.brand LIKE ? OR v.location LIKE ?)');
    const like = `%${search.trim()}%`;
    params.push(like, like, like);
  }
  // Real-time availability: hide vehicles with a blocking booking in the requested window.
  if (isValidDate(start) && isValidDate(end) && start <= end) {
    where.push(`NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.vehicle_id = v.id
        AND b.status IN ('pending','approved')
        AND NOT (b.end_date < ? OR b.start_date > ?)
    )`);
    params.push(start, end);
  }

  const sortMap = {
    price_asc: 'v.price_daily ASC',
    price_desc: 'v.price_daily DESC',
    newest: 'v.created_at DESC',
  };
  const orderBy = sortMap[sort] || 'v.created_at DESC';

  const rows = db
    .prepare(
      `SELECT v.id, v.name, v.brand, v.model_year, v.type, v.fuel_type, v.transmission, v.seats,
              v.price_daily, v.price_weekly, v.price_monthly, v.location, v.image_url,
              u.name AS agency_name
         FROM vehicles v
         JOIN users u ON u.id = v.agency_id
        WHERE ${where.join(' AND ')}
        ORDER BY ${orderBy}`
    )
    .all(...params);

  res.json({ vehicles: rows, count: rows.length });
});

/* ------------------------------- agency fleet ------------------------------ */

// GET /api/vehicles/mine — the agency's full fleet, every status. (Must precede /:id.)
router.get('/mine', auth, requireRole('agency'), (req, res) => {
  const rows = db
    .prepare(
      `SELECT v.*,
              (SELECT COUNT(*) FROM bookings b
                WHERE b.vehicle_id = v.id AND b.status IN ('pending','approved')) AS active_bookings
         FROM vehicles v
        WHERE v.agency_id = ?
        ORDER BY v.created_at DESC`
    )
    .all(req.user.id);
  res.json({ vehicles: rows });
});

// GET /api/vehicles/:id — vehicle detail + currently blocked date ranges.
router.get('/:id', (req, res) => {
  const vehicle = db
    .prepare(
      `SELECT v.*, u.name AS agency_name
         FROM vehicles v JOIN users u ON u.id = v.agency_id
        WHERE v.id = ?`
    )
    .get(req.params.id);

  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const bookedRanges = db
    .prepare(
      `SELECT start_date, end_date FROM bookings
        WHERE vehicle_id = ? AND status IN ('pending','approved') AND end_date >= ?
        ORDER BY start_date ASC`
    )
    .all(vehicle.id, todayISO());

  res.json({ vehicle, bookedRanges });
});

/* --------------------------- create / update / etc ------------------------- */

function validateVehiclePayload(body) {
  const b = body || {};
  const errors = [];

  if (!b.name?.trim()) errors.push('name');
  if (!b.brand?.trim()) errors.push('brand');
  const year = Number(b.model_year);
  if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 1) errors.push('model_year');
  if (!['2W', '4W'].includes(b.type)) errors.push('type');
  if (!FUEL_TYPES.includes(b.fuel_type)) errors.push('fuel_type');
  if (!TRANSMISSIONS.includes(b.transmission)) errors.push('transmission');
  const seats = Number(b.seats);
  if (!Number.isInteger(seats) || seats < 1 || seats > 12) errors.push('seats');
  if (!b.vehicle_number?.trim()) errors.push('vehicle_number');
  for (const key of ['price_daily', 'price_weekly', 'price_monthly']) {
    const p = Number(b[key]);
    if (!Number.isFinite(p) || p <= 0 || p > 10_000_000) errors.push(key);
  }
  if (!b.location?.trim()) errors.push('location');

  if (errors.length) return { error: `Invalid or missing fields: ${errors.join(', ')}` };

  return {
    data: {
      name: b.name.trim(),
      brand: b.brand.trim(),
      model_year: year,
      type: b.type,
      fuel_type: b.fuel_type,
      transmission: b.transmission,
      seats,
      vehicle_number: b.vehicle_number.trim().toUpperCase(),
      price_daily: Math.round(Number(b.price_daily)),
      price_weekly: Math.round(Number(b.price_weekly)),
      price_monthly: Math.round(Number(b.price_monthly)),
      location: b.location.trim(),
      image_url: b.image_url?.trim() || null,
      description: b.description?.trim() || null,
    },
  };
}

// POST /api/vehicles — agency lists a vehicle; enters admin approval queue.
router.post('/', auth, requireRole('agency'), (req, res) => {
  const { error, data } = validateVehiclePayload(req.body);
  if (error) return res.status(400).json({ error });

  const dup = db.prepare('SELECT id FROM vehicles WHERE vehicle_number = ?').get(data.vehicle_number);
  if (dup) return res.status(409).json({ error: 'A vehicle with this registration number already exists' });

  const result = db
    .prepare(
      `INSERT INTO vehicles
         (agency_id, name, brand, model_year, type, fuel_type, transmission, seats,
          vehicle_number, price_daily, price_weekly, price_monthly, location, image_url, description)
       VALUES (@agency_id, @name, @brand, @model_year, @type, @fuel_type, @transmission, @seats,
               @vehicle_number, @price_daily, @price_weekly, @price_monthly, @location, @image_url, @description)`
    )
    .run({ agency_id: req.user.id, ...data });

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ vehicle, message: 'Vehicle submitted for admin approval' });
});

function loadOwnedVehicle(req, res) {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return null;
  }
  if (vehicle.agency_id !== req.user.id) {
    res.status(403).json({ error: 'This vehicle belongs to another agency' });
    return null;
  }
  return vehicle;
}

// PUT /api/vehicles/:id — edit own vehicle. A rejected listing re-enters the approval queue.
router.put('/:id', auth, requireRole('agency'), (req, res) => {
  const vehicle = loadOwnedVehicle(req, res);
  if (!vehicle) return;

  const { error, data } = validateVehiclePayload(req.body);
  if (error) return res.status(400).json({ error });

  const dup = db
    .prepare('SELECT id FROM vehicles WHERE vehicle_number = ? AND id != ?')
    .get(data.vehicle_number, vehicle.id);
  if (dup) return res.status(409).json({ error: 'A vehicle with this registration number already exists' });

  const nextStatus = vehicle.status === 'rejected' ? 'pending' : vehicle.status;

  db.prepare(
    `UPDATE vehicles SET
       name=@name, brand=@brand, model_year=@model_year, type=@type, fuel_type=@fuel_type,
       transmission=@transmission, seats=@seats, vehicle_number=@vehicle_number,
       price_daily=@price_daily, price_weekly=@price_weekly, price_monthly=@price_monthly,
       location=@location, image_url=@image_url, description=@description, status=@status
     WHERE id=@id`
  ).run({ ...data, status: nextStatus, id: vehicle.id });

  res.json({ vehicle: db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle.id) });
});

// PATCH /api/vehicles/:id/availability — block for maintenance / bring back online.
router.patch('/:id/availability', auth, requireRole('agency'), (req, res) => {
  const vehicle = loadOwnedVehicle(req, res);
  if (!vehicle) return;

  const { availability } = req.body || {};
  if (!['available', 'maintenance'].includes(availability)) {
    return res.status(400).json({ error: 'availability must be "available" or "maintenance"' });
  }
  db.prepare('UPDATE vehicles SET availability = ? WHERE id = ?').run(availability, vehicle.id);
  res.json({ vehicle: db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle.id) });
});

// DELETE /api/vehicles/:id — blocked while active bookings exist.
router.delete('/:id', auth, requireRole('agency'), (req, res) => {
  const vehicle = loadOwnedVehicle(req, res);
  if (!vehicle) return;

  const active = db
    .prepare(`SELECT COUNT(*) AS c FROM bookings WHERE vehicle_id = ? AND status IN ('pending','approved')`)
    .get(vehicle.id).c;
  if (active > 0) {
    return res.status(409).json({
      error: 'This vehicle has pending or approved bookings. Resolve them first, or block it for maintenance instead.',
    });
  }
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(vehicle.id);
  res.json({ message: 'Vehicle removed from your fleet' });
});

module.exports = router;

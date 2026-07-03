const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'rentigo.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','agency','admin')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  brand          TEXT    NOT NULL,
  model_year     INTEGER NOT NULL,
  type           TEXT    NOT NULL CHECK (type IN ('2W','4W')),
  fuel_type      TEXT    NOT NULL CHECK (fuel_type IN ('Petrol','Diesel','Electric','Hybrid','CNG')),
  transmission   TEXT    NOT NULL CHECK (transmission IN ('Manual','Automatic')),
  seats          INTEGER NOT NULL DEFAULT 2,
  vehicle_number TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  price_daily    INTEGER NOT NULL CHECK (price_daily > 0),
  price_weekly   INTEGER NOT NULL CHECK (price_weekly > 0),
  price_monthly  INTEGER NOT NULL CHECK (price_monthly > 0),
  location       TEXT    NOT NULL,
  image_url      TEXT,
  description    TEXT,
  status         TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  availability   TEXT    NOT NULL DEFAULT 'available' CHECK (availability IN ('available','maintenance')),
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id    INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id   INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  start_date    TEXT    NOT NULL,
  end_date      TEXT    NOT NULL,
  duration_type TEXT    NOT NULL CHECK (duration_type IN ('daily','weekly','monthly')),
  days          INTEGER NOT NULL CHECK (days > 0),
  total_price   INTEGER NOT NULL CHECK (total_price > 0),
  status        TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','completed')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON bookings(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_public ON vehicles(status, availability);
CREATE INDEX IF NOT EXISTS idx_vehicles_agency ON vehicles(agency_id);
`);

/* ---------------------------------- seed ---------------------------------- */

function isoDaysFromNow(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) return;

  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );

  const admin = insertUser.run('RentiGo Admin', 'admin@rentigo.com', hash('admin123'), 'admin');
  const agency = insertUser.run('HillRide Rentals', 'agency@rentigo.com', hash('agency123'), 'agency');
  const rider = insertUser.run('Hitesh Kumar', 'rider@rentigo.com', hash('rider123'), 'customer');

  const agencyId = agency.lastInsertRowid;
  const riderId = rider.lastInsertRowid;

  const insertVehicle = db.prepare(`
    INSERT INTO vehicles
      (agency_id, name, brand, model_year, type, fuel_type, transmission, seats,
       vehicle_number, price_daily, price_weekly, price_monthly, location, image_url, description, status)
    VALUES (@agency_id, @name, @brand, @model_year, @type, @fuel_type, @transmission, @seats,
            @vehicle_number, @price_daily, @price_weekly, @price_monthly, @location, @image_url, @description, @status)
  `);

  const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=60`;

  const fleet = [
    {
      name: 'Classic 350', brand: 'Royal Enfield', model_year: 2024, type: '2W',
      fuel_type: 'Petrol', transmission: 'Manual', seats: 2, vehicle_number: 'HP01A1234',
      price_daily: 899, price_weekly: 5499, price_monthly: 17999, location: 'Manali',
      image_url: img('photo-1558981403-c5f9899a28bc'),
      description: 'The definitive Himalayan touring machine. Thump your way up the Rohtang road with a relaxed riding posture and a tank range built for long hauls.',
      status: 'approved',
    },
    {
      name: 'Activa 6G', brand: 'Honda', model_year: 2023, type: '2W',
      fuel_type: 'Petrol', transmission: 'Automatic', seats: 2, vehicle_number: 'HP68B4521',
      price_daily: 449, price_weekly: 2799, price_monthly: 8999, location: 'Hamirpur',
      image_url: img('photo-1591637333184-19aa84b3e01f'),
      description: 'Zero-fuss city runner. Silent start, under-seat storage and the easiest thing to park anywhere in town.',
      status: 'approved',
    },
    {
      name: '450X Gen 3', brand: 'Ather', model_year: 2024, type: '2W',
      fuel_type: 'Electric', transmission: 'Automatic', seats: 2, vehicle_number: 'HP03E7788',
      price_daily: 649, price_weekly: 3999, price_monthly: 12999, location: 'Shimla',
      image_url: img('photo-1621972660772-6a0427d5e102'),
      description: 'Quick, connected and completely electric. Warp mode for the climbs, regen for the way back down.',
      status: 'approved',
    },
    {
      name: 'Duke 390', brand: 'KTM', model_year: 2023, type: '2W',
      fuel_type: 'Petrol', transmission: 'Manual', seats: 2, vehicle_number: 'HP20K9901',
      price_daily: 1099, price_weekly: 6499, price_monthly: 20999, location: 'Dharamshala',
      image_url: img('photo-1591216105236-5ba45a41b8b8'),
      description: 'The corner rocket. Ride-by-wire, quickshifter and enough torque to make every hairpin feel personal.',
      status: 'approved',
    },
    {
      name: 'Swift ZXi', brand: 'Maruti Suzuki', model_year: 2023, type: '4W',
      fuel_type: 'Petrol', transmission: 'Manual', seats: 5, vehicle_number: 'HP01C5566',
      price_daily: 1799, price_weekly: 10999, price_monthly: 34999, location: 'Hamirpur',
      image_url: img('photo-1549317661-bd32c8ce0db2'),
      description: 'Light, nimble and famously easy on fuel. The sensible pick for daily commutes and weekend errands.',
      status: 'approved',
    },
    {
      name: 'Creta SX(O)', brand: 'Hyundai', model_year: 2024, type: '4W',
      fuel_type: 'Diesel', transmission: 'Automatic', seats: 5, vehicle_number: 'HP02D3344',
      price_daily: 2999, price_weekly: 18999, price_monthly: 59999, location: 'Shimla',
      image_url: img('photo-1502877338535-766e1452684a'),
      description: 'Panoramic sunroof, ventilated seats and a diesel automatic that eats highway kilometres for breakfast.',
      status: 'approved',
    },
    {
      name: 'Thar LX 4x4', brand: 'Mahindra', model_year: 2024, type: '4W',
      fuel_type: 'Diesel', transmission: 'Manual', seats: 4, vehicle_number: 'HP34T0007',
      price_daily: 3499, price_weekly: 21999, price_monthly: 69999, location: 'Manali',
      image_url: img('photo-1568605117036-5fe5e7bab0b7'),
      description: 'Convertible top, low-range gearbox, proper 4x4. Built for river beds, snow lines and everything the map leaves out.',
      status: 'approved',
    },
    {
      name: 'Nexon EV Max', brand: 'Tata', model_year: 2024, type: '4W',
      fuel_type: 'Electric', transmission: 'Automatic', seats: 5, vehicle_number: 'HP07E2210',
      price_daily: 2799, price_weekly: 16999, price_monthly: 54999, location: 'Dharamshala',
      image_url: img('photo-1593941707882-a5bba14938c7'),
      description: '400+ km of certified range and a silent cabin. Charge overnight, drive all day, skip the fuel pump entirely.',
      status: 'approved',
    },
    {
      name: 'Innova Crysta', brand: 'Toyota', model_year: 2023, type: '4W',
      fuel_type: 'Diesel', transmission: 'Manual', seats: 7, vehicle_number: 'HP01G8080',
      price_daily: 3999, price_weekly: 24999, price_monthly: 79999, location: 'Shimla',
      image_url: img('photo-1494976388531-d1058494cdd8'),
      description: 'Seven seats, captain chairs and legendary reliability. The default choice for family trips and airport runs.',
      status: 'approved',
    },
    {
      name: 'Seltos HTX', brand: 'Kia', model_year: 2024, type: '4W',
      fuel_type: 'Petrol', transmission: 'Automatic', seats: 5, vehicle_number: 'HP12S4477',
      price_daily: 2699, price_weekly: 16499, price_monthly: 52999, location: 'Hamirpur',
      image_url: img('photo-1552519507-da3b142c6e3d'),
      description: 'Newly listed — awaiting admin approval. Connected car tech, ADAS and a punchy turbo-petrol.',
      status: 'pending',
    },
  ];

  const insertAll = db.transaction((rows) => {
    for (const row of rows) insertVehicle.run({ agency_id: agencyId, ...row });
  });
  insertAll(fleet);

  // Sample bookings so every dashboard has real data on first run.
  const insertBooking = db.prepare(`
    INSERT INTO bookings (vehicle_id, customer_id, start_date, end_date, duration_type, days, total_price, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // Completed trip in the past (Swift, 3 days).
  insertBooking.run(5, riderId, isoDaysFromNow(-12), isoDaysFromNow(-10), 'daily', 3, 3 * 1799, 'completed');
  // Approved upcoming trip (Classic 350, 5 days) — blocks those dates on the calendar.
  insertBooking.run(1, riderId, isoDaysFromNow(4), isoDaysFromNow(8), 'daily', 5, 5 * 899, 'approved');
  // Pending request waiting on the agency (Thar, 1 week).
  insertBooking.run(7, riderId, isoDaysFromNow(10), isoDaysFromNow(16), 'weekly', 7, 21999, 'pending');

  console.log('[db] Seeded demo data:');
  console.log('     admin@rentigo.com  / admin123   (admin)');
  console.log('     agency@rentigo.com / agency123  (agency — HillRide Rentals)');
  console.log('     rider@rentigo.com  / rider123   (customer)');
  void admin;
}

seed();

module.exports = db;

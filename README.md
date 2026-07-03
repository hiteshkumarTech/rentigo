# RentiGo — Vehicle Rental Management System

A full-stack vehicle rental platform: customers browse and book two/four-wheelers, rental agencies manage fleets and approve bookings, and admins moderate listings, users and platform analytics. The landing page carries a bold CARGOX-inspired motion design (Barlow Condensed display type, deep-teal + yellow palette, animated hero) rearranged for the rental product.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18, Vite, Tailwind CSS 3, `motion` v12 (Framer Motion), lucide-react, React Router v6 |
| Backend  | Node.js, Express 4, better-sqlite3, JWT (jsonwebtoken), bcryptjs |
| Database | SQLite (zero-setup, file-based) |

**Why SQLite instead of MongoDB/PostgreSQL?** The data is inherently relational (users → vehicles → bookings with FK constraints and JOIN-heavy queries), and SQLite gives evaluators a one-command boot with no external service. All queries are parameterized SQL through a thin data layer, so swapping to PostgreSQL later means changing the driver, not the app logic.

## Quickstart

```bash
npm install        # root dev tooling (concurrently)
npm run setup      # installs server + client dependencies
npm run dev        # server on :5000, client on :5173
```

Open http://localhost:5173. The SQLite database is created and seeded automatically on first server start.

**Production build:** `npm run build` then `npm start` — Express serves the built client from `client/dist` on :5000.

## Demo accounts

| Role     | Email               | Password  |
|----------|---------------------|-----------|
| Admin    | admin@rentigo.com   | admin123  |
| Agency   | agency@rentigo.com  | agency123 |
| Customer | rider@rentigo.com   | rider123  |

Seed data includes 10 vehicles (one pending admin approval) and 3 bookings in various states so every dashboard has something to show.

## Features → requirements mapping

**Customer** — browse fleet with filters (type, fuel, price, text search, sort), date-range availability search that hides conflicted vehicles, vehicle detail with pricing tiers and live cost estimate, booking requests, cancel pending/upcoming bookings, booking history with statuses.

**Agency** — fleet CRUD (new/edited listings re-enter admin approval), availability toggle (available/maintenance), booking approve/reject/complete with automatic conflict re-checks, stats (fleet size, pending requests, active rentals today, confirmed revenue).

**Admin** — KPI overview (users, vehicles, bookings, revenue, conversion, utilization, avg rental length), 6-month booking trend, listing approval queue, user activate/deactivate, platform-wide booking monitor.

**Cross-cutting** — JWT auth with role-based access control, mobile-first responsive UI, double-booking prevention.

## Project structure

```
rentigo/
├── package.json          # setup / dev / build / start scripts
├── server/
│   └── src/
│       ├── index.js      # Express app, static serving in prod
│       ├── db.js         # schema + seed (better-sqlite3)
│       ├── middleware/auth.js    # JWT verify + role guard
│       ├── utils/booking.js      # day count, pricing, conflict check
│       └── routes/       # auth, vehicles, bookings, admin
└── client/
    └── src/
        ├── pages/        # Home (hero), Fleet, VehicleDetail, Login, Register, Dashboard
        ├── components/   # Navbar, Shell, PillButton, VehicleCard, modal, chips
        │   └── dashboard/  # CustomerBookings, AgencyPanel, AdminPanel
        ├── context/AuthContext.jsx
        └── lib/          # api helper, formatting + price estimate
```

## API reference

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/auth/register | — | Create customer/agency account |
| POST | /api/auth/login | — | Login, returns JWT |
| GET | /api/auth/me | any | Current session |
| GET | /api/vehicles | — | Public list + filters (`type, fuel, minPrice, maxPrice, search, sort, start, end`) |
| GET | /api/vehicles/:id | — | Detail + booked date ranges |
| GET | /api/vehicles/mine | agency | Own fleet with active booking counts |
| POST | /api/vehicles | agency | Create listing (pending approval) |
| PUT | /api/vehicles/:id | agency | Edit listing (rejected → pending again) |
| PATCH | /api/vehicles/:id/availability | agency | available / maintenance |
| DELETE | /api/vehicles/:id | agency | Delete (blocked while active bookings exist) |
| POST | /api/bookings | customer | Request booking (server-priced, conflict-checked) |
| GET | /api/bookings/my | customer | Own bookings |
| PATCH | /api/bookings/:id/cancel | customer | Cancel pending / upcoming approved |
| GET | /api/bookings/agency | agency | Bookings on own vehicles |
| PATCH | /api/bookings/:id/status | agency | approve / reject / complete (re-checks conflicts) |
| GET | /api/admin/stats | admin | Totals, KPIs, 6-month trend |
| GET | /api/admin/vehicles | admin | All listings |
| PATCH | /api/admin/vehicles/:id/status | admin | approve / reject listing |
| GET | /api/admin/users | admin | Users with activity counts |
| PATCH | /api/admin/users/:id/toggle | admin | Activate / deactivate |
| GET | /api/admin/bookings | admin | All bookings |

## Design notes (CARGOX adaptation)

The hero follows the provided spec: 3-line slide-in headline (**DRIVE / BEYOND / LIMITS**) at `clamp(86px, min(14vh, 11vw), 220px)` with line delays 0 / 0.13 / 0.26s on an `[0.16, 1, 0.3, 1]` expo-out curve, word-by-word tagline reveal (y:100% + rotateX:45, 0.08s stagger), staggered nav entrance, full-screen mobile overlay, and the footer stat + pill CTA with the ring-cutout arrow that rotates −135° → −90° on hover.

Two deliberate rearrangements for the rental product:

1. **Shipping map → availability search card.** The spec's route map is logistics-specific; in its grid slot sits a glassy search card (vehicle type + dates) that deep-links into `/fleet` with live conflict-aware filtering — the highest-value action for a rental landing page.
2. **Video gating fixed.** The spec gates all hero content on the video's `canplay`, which blanks the page if the asset dies. Here the reveal also fires on `error` and a 1s safety timeout, over a designed gradient + glow background. Drop any file at `client/public/hero.mp4` and it's picked up automatically.

## Engineering decisions

- **Server-authoritative pricing** — the client's estimate is display-only; totals are recomputed server-side from the vehicle's stored rates (`daily`, or `ceil` of weeks/months). Tampered payloads can't change price.
- **Double-booking prevention, twice** — new requests are conflict-checked against pending **and** approved bookings; approval re-checks against approved ones (covers two pending requests for the same window). Conflicts return `409` and surface inline in the UI.
- **RBAC middleware** — `auth` + `requireRole('agency')`-style guards on every mutating route; agencies can only touch their own vehicles/bookings (ownership checked in SQL).
- **Security basics** — bcrypt (10 rounds), 7-day JWTs, parameterized statements everywhere, no secrets in the client bundle. Set `JWT_SECRET` in production.
- **Booking lifecycle** — pending → approved → completed, with rejected/cancelled freeing the calendar slot. Vehicles: pending → approved/rejected listing status, plus an independent availability flag for maintenance blocks.

## Deployment (Render, single service)

Build command: `npm install && npm run setup && npm run build` · Start command: `npm start` · Add a persistent disk if you want the SQLite file to survive deploys, and set `JWT_SECRET`. For a managed database later, port `db.js` to PostgreSQL (`pg`) — the SQL is standard.

## Ideas for v2

Payments (Razorpay), image uploads instead of URLs, email notifications on booking state changes, reviews/ratings, per-city fleets with geo search, and PWA install for the customer side.

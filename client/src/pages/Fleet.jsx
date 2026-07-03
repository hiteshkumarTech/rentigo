import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import VehicleCard from '../components/VehicleCard.jsx';
import { api } from '../lib/api.js';
import { todayISO } from '../lib/format.js';

const DEFAULT = { search: '', type: '', fuel: '', minPrice: '', maxPrice: '', start: '', end: '', sort: 'newest' };

export default function Fleet() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => {
    const f = { ...DEFAULT };
    for (const k of Object.keys(DEFAULT)) {
      const v = searchParams.get(k);
      if (v) f[k] = v;
    }
    return f;
  });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const firstRun = useRef(true);

  useEffect(() => {
    const run = () => {
      const p = new URLSearchParams();
      for (const [k, v] of Object.entries(filters)) {
        if (v && !(k === 'sort' && v === 'newest')) p.set(k, v);
      }
      setSearchParams(p, { replace: true }); // keeps the URL shareable / deep-linkable
      setLoading(true);
      setError('');
      api
        .get(`/api/vehicles?${p.toString()}`)
        .then((d) => setVehicles(d.vehicles))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    };

    if (firstRun.current) {
      firstRun.current = false;
      run();
      return;
    }
    const t = setTimeout(run, 300); // debounce while typing
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const isFiltered = useMemo(() => Object.keys(DEFAULT).some((k) => filters[k] !== DEFAULT[k]), [filters]);

  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-display uppercase leading-[0.85] text-white" style={{ fontSize: 'clamp(48px, 8vw, 96px)' }}>
          The <span className="text-brand">fleet</span>
        </h1>
        <p className="mt-2 text-sm text-white/50">
          {loading ? 'Checking availability…' : `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} ready to go`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        {/* -------- filters -------- */}
        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <div className="mb-4 flex items-center gap-2 text-white/60">
            <SlidersHorizontal size={15} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Filters</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Search</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  className="input !pl-9"
                  placeholder="Name, brand or city"
                  value={filters.search}
                  onChange={set('search')}
                />
              </div>
            </div>

            <div>
              <label className="label">Type</label>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                {[
                  ['', 'All'],
                  ['2W', '2W'],
                  ['4W', '4W'],
                ].map(([val, lab]) => (
                  <button
                    key={lab}
                    onClick={() => setFilters((f) => ({ ...f, type: val }))}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                      filters.type === val ? 'bg-brand text-ink' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {lab}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Fuel</label>
              <select className="input" value={filters.fuel} onChange={set('fuel')}>
                <option value="">Any fuel</option>
                {['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Price per day (₹)</label>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="number" min="0" placeholder="Min" value={filters.minPrice} onChange={set('minPrice')} />
                <input className="input" type="number" min="0" placeholder="Max" value={filters.maxPrice} onChange={set('maxPrice')} />
              </div>
            </div>

            <div>
              <label className="label">Rental window</label>
              <div className="space-y-2">
                <input className="input" type="date" min={todayISO()} value={filters.start} onChange={set('start')} />
                <input className="input" type="date" min={filters.start || todayISO()} value={filters.end} onChange={set('end')} />
              </div>
              <p className="mt-1.5 text-[11px] text-white/35">Pick both dates to hide vehicles already booked then.</p>
            </div>

            <div>
              <label className="label">Sort by</label>
              <select className="input" value={filters.sort} onChange={set('sort')}>
                <option value="newest">Newest first</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </div>

            {isFiltered && (
              <button className="btn-ghost w-full" onClick={() => setFilters({ ...DEFAULT })}>
                Clear all filters
              </button>
            )}
          </div>
        </aside>

        {/* -------- results -------- */}
        <section>
          {error && (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="aspect-[3/2] animate-pulse bg-white/5" />
                  <div className="space-y-2 p-4">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-white/5" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : vehicles.length === 0 ? (
            <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
              <p className="font-display text-4xl uppercase text-white/70">Nothing matches</p>
              <p className="mt-2 max-w-sm text-sm text-white/45">
                Try widening the price range, clearing the dates, or searching a different city.
              </p>
              <button className="btn-brand mt-6" onClick={() => setFilters({ ...DEFAULT })}>
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {vehicles.map((v, i) => (
                <VehicleCard key={v.id} vehicle={v} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}

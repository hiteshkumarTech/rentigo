import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { EXPO_OUT, FALLBACK_IMG, inr, onImgError } from '../lib/format.js';

export default function VehicleCard({ vehicle: v, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EXPO_OUT, delay: Math.min(index * 0.06, 0.5) }}
      className="card group flex flex-col overflow-hidden"
    >
      <Link to={`/vehicles/${v.id}`} className="relative block aspect-[3/2] overflow-hidden">
        <img
          src={v.image_url || FALLBACK_IMG}
          onError={onImgError}
          alt={`${v.brand} ${v.name}`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand">
          {v.type === '2W' ? '2-Wheeler' : '4-Wheeler'}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-2xl uppercase leading-tight text-white">
            {v.brand} {v.name}
          </h3>
          <p className="mt-1 text-xs text-white/50">
            {v.model_year} · {v.fuel_type} · {v.transmission} · {v.seats} seats
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-white/40">
            <MapPin size={12} /> {v.location} · {v.agency_name}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3">
          <div>
            <span className="text-lg font-bold text-brand">{inr(v.price_daily)}</span>
            <span className="text-xs text-white/40"> /day</span>
          </div>
          <Link to={`/vehicles/${v.id}`} className="btn-brand !px-3.5 !py-1.5 !text-xs">
            View &amp; book
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

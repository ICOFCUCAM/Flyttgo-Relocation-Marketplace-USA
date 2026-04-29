import { useEffect, useState } from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';

/**
 * Live-booking social-proof ticker.
 *
 * Surfaces a rolling stream of fake-but-plausible recent bookings so a
 * visitor lands on a marketplace that *feels* alive. Strictly cosmetic —
 * we are not (yet) reading from a real bookings stream because the
 * shared Supabase project's `bookings` table needs RLS-safe public-read
 * scaffolding before we can publish customer details. When that lands,
 * swap the static array for a Supabase realtime subscription on
 * `bookings.status = 'completed'` filtered by `created_at`.
 */

interface TickerEntry {
  name:    string;
  route:   string;
  ago:     string;
  flag:    string;
}

const SAMPLE_BOOKINGS: TickerEntry[] = [
  { name: 'Sarah M.',  route: 'Brooklyn → Manhattan',     ago: '2 min ago',  flag: '🇺🇸' },
  { name: 'Lukas K.',  route: 'Berlin Mitte → Kreuzberg',  ago: '4 min ago',  flag: '🇩🇪' },
  { name: 'Sophie L.', route: 'Paris 15e → Lyon',          ago: '6 min ago',  flag: '🇫🇷' },
  { name: 'James W.',  route: 'London E14 → Manchester',   ago: '9 min ago',  flag: '🇬🇧' },
  { name: 'Erik H.',   route: 'Oslo → Bergen',             ago: '12 min ago', flag: '🇳🇴' },
  { name: 'Ava T.',    route: 'Toronto → Montréal',        ago: '14 min ago', flag: '🇨🇦' },
  { name: 'Marco D.',  route: 'Hamburg → München',         ago: '17 min ago', flag: '🇩🇪' },
  { name: 'Olivia R.', route: 'Austin → Dallas',           ago: '20 min ago', flag: '🇺🇸' },
  { name: 'Camille B.',route: 'Marseille → Bordeaux',      ago: '23 min ago', flag: '🇫🇷' },
  { name: 'Ethan B.',  route: 'Edinburgh → Glasgow',       ago: '26 min ago', flag: '🇬🇧' },
];

export default function LiveBookingTicker() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % SAMPLE_BOOKINGS.length);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const entry = SAMPLE_BOOKINGS[idx];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-4 bottom-4 z-30 hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-lg px-4 py-2.5 max-w-[18rem] animate-in slide-in-from-bottom-2 duration-300"
      key={idx}
    >
      <div className="relative w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 size={18} className="text-emerald-600" />
        <span className="absolute -top-0.5 -right-0.5 text-base leading-none">{entry.flag}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-900 truncate">
          {entry.name} just booked
        </p>
        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
          <MapPin size={10} className="text-slate-400" />
          {entry.route}
          <span className="mx-1">·</span>
          {entry.ago}
        </p>
      </div>
    </div>
  );
}

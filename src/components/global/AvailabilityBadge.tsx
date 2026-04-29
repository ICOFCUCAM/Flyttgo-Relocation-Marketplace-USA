import { Zap, Flame, Clock, AlertCircle, type LucideIcon } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
 * <AvailabilityBadge> — surfaces a provider's live booking pressure
 * on cards (home grid, directory, recently-viewed, profile sidebar).
 * Marketplace pattern borrowed from Airbnb / Booking — adds urgency
 * without faking scarcity, since the underlying state is computed
 * from real accepted-jobs vs declared capacity (curated for now).
 *
 * Tones:
 *   - available_now : emerald — neutral / encouraging
 *   - books_fast    : brand   — high demand
 *   - slots_left    : danger  — actionable urgency, carries count
 *   - busy          : slate   — sets expectation, joining waitlist
 * ───────────────────────────────────────────────────────────────── */

type Availability = 'available_now' | 'books_fast' | 'slots_left' | 'busy';

interface Props {
  availability: Availability;
  /** Required when availability='slots_left'. */
  slotsLeft?:   number;
  /** Compact = tighter padding + icon only on the smallest variant. */
  size?:        'sm' | 'md';
  className?:   string;
}

const COPY: Record<Availability, { label: string; icon: LucideIcon }> = {
  available_now: { label: 'Available now', icon: Zap },
  books_fast:    { label: 'Books fast',    icon: Flame },
  slots_left:    { label: 'slots left',    icon: AlertCircle },
  busy:          { label: 'Joining waitlist', icon: Clock },
};

const TONE: Record<Availability, string> = {
  available_now: 'bg-emerald-50 text-emerald-700',
  books_fast:    'bg-amber-50  text-amber-700',
  slots_left:    'bg-rose-50   text-rose-700',
  busy:          'bg-slate-100 text-slate-600',
};

export default function AvailabilityBadge({
  availability, slotsLeft, size = 'md', className = '',
}: Props) {
  const { label, icon: Icon } = COPY[availability];
  const sizeClass = size === 'sm'
    ? 'px-1.5 py-0.5 text-[9px]'
    : 'px-2 py-1 text-[10px]';
  const text = availability === 'slots_left' && slotsLeft != null
    ? `${slotsLeft} ${label}`
    : label;
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-md ${TONE[availability]} ${sizeClass} ${className}`}
      aria-label={`Availability: ${text}`}
    >
      <Icon size={size === 'sm' ? 9 : 10} />
      {text}
    </span>
  );
}

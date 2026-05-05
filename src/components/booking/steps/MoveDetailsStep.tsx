import { useTranslation } from 'react-i18next';
import { Check, Users } from 'lucide-react';
import { VAN_TYPES } from '../../../lib/constants';

const MOVE_TYPES = [
  { id: 'apartment', label: 'Apartment',    icon: '🏢' },
  { id: 'house',     label: 'House',        icon: '🏠' },
  { id: 'office',    label: 'Office',       icon: '💼' },
  { id: 'student',   label: 'Student Move', icon: '🎓' },
  { id: 'furniture', label: 'Furniture',    icon: '🛋️' },
  { id: 'delivery',  label: 'Delivery',     icon: '📦' },
];

export function MoveDetailsStep({
  moveType, setMoveType,
  vanType, setVanType,
  helpers, setHelpers,
  setError,
}: {
  moveType: string;
  setMoveType: (v: string) => void;
  vanType: string;
  setVanType: (v: string) => void;
  helpers: number;
  setHelpers: (fn: (h: number) => number) => void;
  setError: (e: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">

      {/* ── Move type ─────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-xl font-extrabold text-slate-900 mb-1 tracking-tight">
          {t('booking.moveTitle')}
        </h2>
        <p className="text-slate-500 text-sm mb-5">{t('booking.moveSubtitle')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MOVE_TYPES.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setMoveType(item.id); setError(''); }}
              className={`p-4 rounded-xl border-2 text-center transition-all ${FOCUS_RING} ${
                moveType === item.id
                  ? 'border-amber-500 bg-amber-50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              aria-pressed={moveType === item.id}
            >
              <div className="text-3xl mb-2" aria-hidden="true">{item.icon}</div>
              <div className="text-sm font-semibold text-slate-800">{item.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Vehicle picker ──────────────────────────────────
       *   Each vehicle card surfaces the actual vehicle image so a
       *   customer can see the size class instead of relying on
       *   capacity numbers alone. Selected card lifts on a subtle
       *   shadow + amber ring; unselected cards keep a muted ring
       *   to read as "options" without competing with the choice. */}
      {moveType && (
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-800 mb-3">
            {t('booking.vanSizeLabel')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VAN_TYPES.map(van => {
              const selected = vanType === van.id;
              return (
                <button
                  key={van.id}
                  type="button"
                  onClick={() => setVanType(van.id)}
                  aria-pressed={selected}
                  className={`group relative overflow-hidden rounded-xl border-2 text-left transition-all ${FOCUS_RING} ${
                    selected
                      ? 'border-amber-500 shadow-lg shadow-amber-500/10 bg-white'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-md'
                  }`}
                >
                  {/* Image strip — 16:9 aspect, subtle gradient overlay
                   *  so the vehicle reads cleanly even on busy photos. */}
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                    <img
                      src={van.image}
                      alt={`${van.name} — ${van.capacity}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                    {/* Selected check chip */}
                    {selected && (
                      <span className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-slate-900 shadow-md">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                    {/* Price chip — bottom-left over the image */}
                    <span className="absolute bottom-2 left-2 inline-flex items-center px-2 py-0.5 rounded-md bg-white/95 text-slate-900 text-xs font-bold shadow-sm">
                      ${van.pricePerHour}/hr
                    </span>
                  </div>

                  {/* Name + specs strip */}
                  <div className="p-3.5">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className={`font-bold text-sm ${selected ? 'text-amber-700' : 'text-slate-900'}`}>
                        {van.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-snug">
                      {van.capacity} · {van.payload}
                    </p>
                    {van.bestFor.length > 0 && (
                      <p className="mt-1.5 text-[11px] text-slate-600 leading-snug line-clamp-1">
                        Best for: {van.bestFor.slice(0, 2).join(', ')}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Helpers stepper ─────────────────────────────────
       *   Pill-shaped −/value/+ control with explicit "add another
       *   helper" copy when at zero. Three is the cap (consistent
       *   with PRICING.extras hourly pricing). */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          {t('booking.helpersLabel')}
        </label>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center bg-slate-100 rounded-full p-1">
            <button
              type="button"
              onClick={() => setHelpers(h => Math.max(0, h - 1))}
              aria-label="Decrease helpers"
              disabled={helpers === 0}
              className={`w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed ${FOCUS_RING_TIGHT}`}
            >
              <span className="text-lg leading-none" aria-hidden>−</span>
            </button>
            <span
              className="text-base font-bold text-slate-900 w-10 text-center inline-flex items-center justify-center gap-1"
              aria-live="polite"
            >
              <Users size={14} className="text-slate-500" />
              {helpers}
            </span>
            <button
              type="button"
              onClick={() => setHelpers(h => Math.min(3, h + 1))}
              aria-label="Increase helpers"
              disabled={helpers >= 3}
              className={`w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed ${FOCUS_RING_TIGHT}`}
            >
              <span className="text-lg leading-none" aria-hidden>+</span>
            </button>
          </div>
          <span className="text-sm text-slate-600">
            {helpers === 0
              ? 'Add a helper for heavy lifting (optional)'
              : `${helpers} helper${helpers > 1 ? 's' : ''} · ${t('booking.helpersPerHour')}`}
          </span>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect } from 'react';
import { X, Star, ShieldCheck, Award, MapPin, Trash2 } from 'lucide-react';
import {
  useCompareStore,
  removeFromCompare,
  clearCompare,
} from '../../lib/compare-store';
import { useApp } from '../../lib/store';
import type { Page } from '../../lib/store';

/**
 * Side-by-side comparison drawer. Slides up from the viewport bottom
 * (mobile) / docks as a centered modal (lg+) showing the up-to-three
 * shortlisted providers in a comparison grid. Each column has the
 * provider's name + flag + city + rating + From-$ price + verification
 * chips + a "Book this provider" CTA.
 *
 * For now "Book this provider" routes to the global booking flow —
 * once the marketplace persists provider selections in BookingData
 * we'll pre-select the chosen provider when entering /book.
 */
export default function ComparisonDrawer({ onClose }: { onClose: () => void }) {
  const items = useCompareStore();
  const { setPage } = useApp();

  /* Body-scroll lock while open. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /* Esc to dismiss. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function bookProvider(_id: string) {
    setPage('booking' as Page);
    onClose();
  }

  /* Pre-computed comparison rows so the table renders cleanly when
   * column count varies. Each row exposes a label and a renderer that
   * receives one provider; the renderer returns the cell value. */
  const ROWS: Array<{ label: string; render: (it: typeof items[number]) => React.ReactNode }> = [
    {
      label: 'Rating',
      render: it => (
        <span className="inline-flex items-center gap-1.5">
          <Star size={14} className="fill-brand-500 text-brand-500" />
          <strong className="text-ink-900">{it.rating.toFixed(2)}</strong>
          <span className="text-slate-500">·</span>
          <span className="text-slate-500">{it.reviews.toLocaleString()}</span>
        </span>
      ),
    },
    {
      label: 'Booking from',
      render: it => <span className="font-extrabold text-brand-600">{it.fromPrice}</span>,
    },
    {
      label: 'Tier',
      render: it => it.badge ? (
        <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
          <Award size={10} /> {it.badge}
        </span>
      ) : <span className="text-slate-400">—</span>,
    },
    {
      label: 'Verifications',
      render: it => it.verified && it.verified.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {it.verified.map(v => (
            <span key={v} className="inline-flex items-center gap-1 bg-trust-50 text-trust-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
              <ShieldCheck size={10} /> {v}
            </span>
          ))}
        </div>
      ) : <span className="text-slate-400">—</span>,
    },
    {
      label: 'City',
      render: it => (
        <span className="inline-flex items-center gap-1.5 text-slate-700">
          <MapPin size={12} className="text-slate-400" />
          {it.city}
        </span>
      ),
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compare providers"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-elevated w-full sm:max-w-5xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
              Side-by-side comparison
            </p>
            <h2 className="text-lg sm:text-2xl font-extrabold text-ink-900">
              {items.length === 1 ? '1 provider' : `${items.length} providers`} on your shortlist
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { clearCompare(); onClose(); }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-danger-600 transition-colors"
            >
              <Trash2 size={12} /> Clear all
            </button>
            <button
              onClick={onClose}
              aria-label="Close comparison"
              className="p-2 rounded-lg text-slate-400 hover:text-ink-900 hover:bg-slate-100 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
          >
            {/* Top row: provider header with name + flag + remove */}
            {items.map(it => (
              <div key={`head-${it.id}`} className="flex flex-col gap-2 bg-surface-soft border border-slate-200 rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <span className="text-2xl leading-none" aria-hidden>{it.flag}</span>
                  <button
                    onClick={() => removeFromCompare(it.id)}
                    aria-label={`Remove ${it.name}`}
                    className="text-slate-400 hover:text-danger-600 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="font-extrabold text-ink-900 text-base leading-tight">{it.name}</p>
                <p className="text-[11px] text-slate-500">{it.city}</p>
              </div>
            ))}
          </div>

          {/* Comparison rows */}
          <div className="mt-4 grid gap-2">
            {ROWS.map(row => (
              <div
                key={row.label}
                className="grid gap-4 items-center"
                style={{ gridTemplateColumns: `8rem repeat(${items.length}, minmax(0, 1fr))` }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {row.label}
                </span>
                {items.map(it => (
                  <div key={`${row.label}-${it.id}`} className="text-sm py-2 border-t border-slate-200">
                    {row.render(it)}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Per-column CTA */}
          <div
            className="mt-5 grid gap-4"
            style={{ gridTemplateColumns: `8rem repeat(${items.length}, minmax(0, 1fr))` }}
          >
            <span />
            {items.map(it => (
              <button
                key={`cta-${it.id}`}
                onClick={() => bookProvider(it.id)}
                className="w-full px-3 py-2.5 bg-brand-500 hover:bg-brand-600 text-ink-900 font-bold text-sm rounded-xl transition-base ease-marketplace shadow-soft"
              >
                Book this provider →
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-surface-soft text-[11px] text-slate-500">
          <strong className="text-ink-900">Tip:</strong> selections persist if you close this window. Your shortlist also syncs across browser tabs.
        </div>
      </div>
    </div>
  );
}

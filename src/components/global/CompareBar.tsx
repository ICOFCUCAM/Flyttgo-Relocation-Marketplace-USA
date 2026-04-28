import React from 'react';
import { GitCompare, X, ChevronUp } from 'lucide-react';
import { useCompareStore, removeFromCompare, clearCompare, COMPARE_MAX } from '../../lib/compare-store';
import { useApp } from '../../lib/store';
import { track } from '../../lib/analytics';

/**
 * Floating "Compare (n)" bar that docks to the bottom-center of the
 * viewport whenever the customer has at least one provider in the
 * compare shortlist. Clicking it (or the items inside) opens the
 * full-side-by-side ComparisonDrawer.
 *
 * Hidden on the booking flow + auth-callback so the user isn't
 * distracted while completing their booking.
 */

const HIDE_ON_PATHS: RegExp[] = [/^\/book/, /^\/payment/, /^\/auth\/callback/];

export default function CompareBar() {
  const items = useCompareStore();
  const { setPage, currentPage } = useApp();

  /* Suppress on the compare page itself so we don't render the bar
   * on top of the table the customer is already reading. */
  if (currentPage === 'compare') return null;

  /* Path-based suppression — the compare bar is a discovery tool, not
   * a booking-flow tool. */
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (HIDE_ON_PATHS.some(re => re.test(path))) return null;
  }

  if (items.length === 0) return null;

  return (
    <>
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-20 lg:bottom-6 z-40 animate-in slide-in-from-bottom-4 duration-300"
        role="region"
        aria-label="Provider compare shortlist"
      >
        <div className="bg-ink-900 text-white rounded-2xl shadow-elevated border border-white/10 flex items-center gap-2 px-3 py-2 min-w-[20rem] max-w-[28rem]">
          <div className="flex items-center gap-2 flex-shrink-0 px-1">
            <GitCompare size={16} className="text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
              Compare
            </span>
            <span className="text-xs text-white/60">({items.length}/{COMPARE_MAX})</span>
          </div>

          <div className="flex-1 flex items-center gap-1 min-w-0 overflow-x-auto">
            {items.map(it => (
              <div
                key={it.id}
                className="flex-shrink-0 inline-flex items-center gap-1 bg-white/10 hover:bg-white/15 transition-base ease-marketplace rounded-full pl-2 pr-1 py-1"
              >
                <span aria-hidden className="text-sm leading-none">{it.flag}</span>
                <span className="text-[11px] font-semibold whitespace-nowrap max-w-[7rem] truncate">{it.name}</span>
                <button
                  onClick={() => removeFromCompare(it.id)}
                  aria-label={`Remove ${it.name} from compare`}
                  className="ml-0.5 w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              track('compare_bar_opened', { count: items.length });
              setPage('compare');
            }}
            className="flex-shrink-0 inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-ink-900 font-bold text-xs px-3 py-2 rounded-xl transition-base ease-marketplace"
          >
            <ChevronUp size={14} />
            Compare
          </button>
        </div>

        <button
          onClick={() => clearCompare()}
          className="block mx-auto mt-2 text-[10px] uppercase tracking-wider text-white/50 hover:text-white/80 transition-colors"
        >
          Clear all
        </button>
      </div>
    </>
  );
}

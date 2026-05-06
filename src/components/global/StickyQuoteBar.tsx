import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useApp } from '../../lib/store';
import { openQuickQuote } from '../../lib/quick-quote';

/**
 * Slim sticky quote bar that drops in from the top once the user has
 * scrolled past the hero. Always-visible "Get a quote" CTA so the
 * conversion path is one click away even after the user has scrolled
 * deep into the marketing content.
 *
 * Hidden until 800px of scroll, hidden inside the booking flow / on
 * auth-callback / on dashboards.
 */

const HIDE_ON = ['booking', 'auth-callback', 'payment', 'driver-portal', 'admin', 'customer-dashboard'];

export default function StickyQuoteBar() {
  const { currentPage } = useApp();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 800);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (HIDE_ON.includes(currentPage) || !shown) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-30 bg-amber-400/95 backdrop-blur shadow-md animate-in slide-in-from-top-2 duration-300"
      role="region"
      aria-label="Quick booking CTA"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={14} className="text-slate-900 hidden sm:block flex-shrink-0" />
          <p className="text-[13px] sm:text-sm font-bold text-slate-900 truncate">
            Compare licensed movers in 60 seconds — escrow protected
          </p>
        </div>
        <button
          onClick={() => openQuickQuote({ source: 'sticky_bar' })}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-lg transition shadow"
        >
          Get a quote →
        </button>
      </div>
    </div>
  );
}

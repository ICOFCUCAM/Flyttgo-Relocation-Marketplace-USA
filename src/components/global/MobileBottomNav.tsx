import React from 'react';
import { Home, Search, MessageCircle, User, type LucideIcon } from 'lucide-react';
import { useApp, Page } from '../../lib/store';
import { useAuth } from '../../lib/auth';
import { openQuickQuote } from '../../lib/quick-quote';

/**
 * Mobile bottom tab nav. Sticky to the viewport bottom on screens
 * narrower than `lg`. Four tabs: Home, Markets (cities), Quote
 * (booking), Account (dashboard or sign-in).
 *
 * Hidden when the booking flow is open (the booking flow has its own
 * bottom action bar) and on auth-callback (full-screen Supabase
 * handoff).
 */

interface Tab {
  label: string;
  icon:  LucideIcon;
  page:  Page;
  match: (current: Page) => boolean;
}

const TABS: Tab[] = [
  { label: 'Home',     icon: Home,          page: 'home',      match: (c) => c === 'home' },
  { label: 'Markets',  icon: Search,        page: 'cities',    match: (c) => c.startsWith('market-') || c === 'cities' || c === 'marketplace' },
  { label: 'Quote',    icon: MessageCircle, page: 'booking',   match: (c) => c === 'booking' },
  { label: 'Account',  icon: User,          page: 'profile',   match: (c) => c === 'profile' || c === 'customer-dashboard' || c === 'my-bookings' },
];

const HIDE_ON: Page[] = ['booking', 'auth-callback', 'payment'];

export default function MobileBottomNav() {
  const { currentPage, setPage, setShowAuthModal, setAuthMode } = useApp();
  const { user } = useAuth();

  if (HIDE_ON.includes(currentPage)) return null;

  function handleTabClick(t: Tab) {
    if (t.page === 'profile' && !user) {
      setAuthMode('signin');
      setShowAuthModal(true);
      return;
    }
    /* The Quote tab opens the slide-over drawer instead of jumping to
     * /book — keeps the customer on the current page so they can
     * resume reading after they get their quote. */
    if (t.page === 'booking') {
      openQuickQuote({ source: 'mobile_nav' });
      return;
    }
    setPage(t.page);
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]"
      aria-label="Bottom navigation"
    >
      <div className="grid grid-cols-4">
        {TABS.map(t => {
          const active = t.match(currentPage);
          return (
            <button
              key={t.label}
              onClick={() => handleTabClick(t)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-amber-600' : 'text-slate-500 hover:text-slate-900'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <t.icon size={20} className={active ? 'fill-amber-100' : ''} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-amber-700' : ''}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

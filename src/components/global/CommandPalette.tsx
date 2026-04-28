import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Globe2, Layers, Users, ShieldCheck, Sparkles, ArrowRight,
  Truck, MessageCircle, GitCompare, Bookmark, MapPin, Clock,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { useApp, type Page } from '../../lib/store';
import { useAuth } from '../../lib/auth';
import { applyCountryLanguage } from '../../lib/i18n';
import { track } from '../../lib/analytics';
import { useCompareStore } from '../../lib/compare-store';
import { useSavedQuotesStore } from '../../lib/saved-quotes-store';
import { openQuickQuote } from '../../lib/quick-quote';

/* ─────────────────────────────────────────────────────────────────
 * <CommandPalette> — ⌘K / Ctrl-K cross-marketplace navigator.
 *
 * Three sources surfaced in one searchable list:
 *
 *   1. Markets    — six country shopfronts (with native flag).
 *                   Selecting one switches the i18n language to the
 *                   country default and navigates.
 *   2. Pages      — every public marketing / platform page that lives
 *                   in pageRoutes (about, providers, compliance, …)
 *                   plus the dashboards when the user is signed in.
 *   3. Actions    — verbs the customer might want, regardless of
 *                   where they are right now: Get a quote, Talk to
 *                   support (WhatsApp), Open compare drawer, Toggle
 *                   theme, etc.
 *
 * Recents (local-storage backed, 6 entries) appear at the top when
 * the search box is empty — same pattern as Linear / Stripe.
 *
 * Filtering is a simple substring + token scoring algorithm — no
 * fuzzy library, no extra dep weight. Good enough for a 40-row
 * command list; swap to fuse.js if the catalogue grows past ~150.
 * ───────────────────────────────────────────────────────────────── */

const RECENTS_KEY = 'flyttgo_command_recents_v1';
const RECENTS_MAX = 6;

interface CommandItem {
  id:        string;
  label:     string;
  hint?:     string;
  group:     'Markets' | 'Pages' | 'Actions' | 'Compare' | 'Saved';
  flag?:     string;
  icon?:     LucideIcon;
  shortcut?: string;
  /** Words appended to the label for matching only (not displayed). */
  keywords?: string[];
  /** Run when the user activates this item. */
  perform:   () => void;
}

interface Props {
  open:    boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const { setPage, setShowAuthModal, setAuthMode } = useApp();
  const { user, signOut } = useAuth();
  const compare = useCompareStore();
  const saved   = useSavedQuotesStore();

  const [query,  setQuery]  = useState('');
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<string[]>(() => readRecents());
  const inputRef = useRef<HTMLInputElement>(null);

  /* Reset on every open. */
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setRecents(readRecents());
      /* Wait for the modal to mount before focusing. */
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  /* Esc closes; click-outside is handled by the backdrop element. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /* ── Build the catalogue once per render. The closures capture
   * the latest setPage / store state via useApp / useCompareStore. */
  const catalogue: CommandItem[] = useMemo(() => {
    const go = (p: Page) => () => {
      track('command_palette_action', { type: 'page', target: p });
      onClose();
      setPage(p);
    };

    const markets: CommandItem[] = [
      { id: 'm-us',     label: 'United States Moves & Logistics',  group: 'Markets', flag: '🇺🇸', keywords: ['usa', 'america'],   perform: () => { applyCountryLanguage('us'); go('market-us')(); } },
      { id: 'm-canada', label: 'Canada Moves & Logistics',          group: 'Markets', flag: '🇨🇦', keywords: ['canada'],            perform: () => { applyCountryLanguage('ca'); go('market-canada')(); } },
      { id: 'm-de',     label: 'Germany Moves & Logistics',         group: 'Markets', flag: '🇩🇪', keywords: ['deutschland'],       perform: () => { applyCountryLanguage('de'); go('market-germany')(); } },
      { id: 'm-fr',     label: 'France Moves & Logistics',          group: 'Markets', flag: '🇫🇷', keywords: ['france'],            perform: () => { applyCountryLanguage('fr'); go('market-france')(); } },
      { id: 'm-uk',     label: 'United Kingdom Moves & Logistics',  group: 'Markets', flag: '🇬🇧', keywords: ['britain', 'gb'],     perform: () => { applyCountryLanguage('gb'); go('market-uk')(); } },
      { id: 'm-no',     label: 'Norway Moves & Logistics',          group: 'Markets', flag: '🇳🇴', keywords: ['norge', 'norwegian'], perform: () => { applyCountryLanguage('no'); go('market-norway')(); } },
    ];

    const pages: CommandItem[] = [
      { id: 'p-home',         label: 'Home',                       hint: 'Country picker',         icon: Globe2,       group: 'Pages', perform: go('home') },
      { id: 'p-howit',        label: 'How it works',               hint: '5-step coordination',     icon: Sparkles,     group: 'Pages', perform: go('how-it-works') },
      { id: 'p-providers',    label: 'For providers',              hint: 'Apply to operate',        icon: Users,        group: 'Pages', perform: go('providers') },
      { id: 'p-directory',    label: 'Browse providers',           hint: 'Search + filter directory', icon: SlidersHorizontal, group: 'Pages', keywords: ['directory', 'find', 'movers', 'search'], perform: go('providers-directory') },
      { id: 'p-compliance',   label: 'Compliance',                 hint: 'FMCSA / GVOL / GüKG / …', icon: ShieldCheck,  group: 'Pages', perform: go('compliance') },
      { id: 'p-enterprise',   label: 'Enterprise relocation',      hint: 'Workforce mobility',      icon: Layers,       group: 'Pages', perform: go('enterprise-relocation') },
      { id: 'p-universities', label: 'Universities',               hint: 'Student housing',         icon: Layers,       group: 'Pages', perform: go('universities') },
      { id: 'p-partners',     label: 'Partners & ecosystem',       icon: Layers,                     group: 'Pages', perform: go('partners') },
      { id: 'p-about',        label: 'About',                      icon: Layers,                     group: 'Pages', perform: go('about') },
      { id: 'p-contact',      label: 'Contact',                    icon: MessageCircle,              group: 'Pages', perform: go('contact') },
      { id: 'p-faq',          label: 'FAQ',                        icon: Layers,                     group: 'Pages', perform: go('faq') },
      { id: 'p-help',         label: 'Help center',                icon: Layers,                     group: 'Pages', perform: go('help') },
      { id: 'p-driver-onb',   label: 'Become a provider',          hint: 'Driver / operator apply', icon: Truck,        group: 'Pages', perform: go('driver-onboarding') },
      { id: 'p-subs',         label: 'Subscription tiers',         hint: 'Silver → Elite',          icon: Truck,        group: 'Pages', perform: go('subscriptions') },
      { id: 'p-refer',        label: 'Refer a friend · £25 / £25', hint: 'Give £25, get £25',       icon: Sparkles,     group: 'Pages', keywords: ['referral', 'invite', 'credit'], perform: go('refer') },
    ];

    /* Authenticated-only surfaces. */
    if (user) {
      pages.push(
        { id: 'p-dash',     label: 'My dashboard',  icon: Layers,  group: 'Pages', perform: go('customer-dashboard') },
        { id: 'p-mybook',   label: 'My bookings',   icon: Bookmark,group: 'Pages', perform: go('my-bookings') },
        { id: 'p-profile',  label: 'My profile',    icon: Users,   group: 'Pages', perform: go('profile') },
      );
    }

    const actions: CommandItem[] = [
      { id: 'a-quote',     label: 'Get a quote',                   hint: 'Quick-quote slide-over', icon: Sparkles,     group: 'Actions', shortcut: '⏎', keywords: ['book', 'price'], perform: () => {
        track('command_palette_action', { type: 'quick_quote' });
        onClose();
        openQuickQuote({ source: 'command_palette' });
      } },
      { id: 'a-track',     label: 'Track a delivery',              icon: MapPin,                                                          group: 'Actions',                              perform: go('tracking') },
      { id: 'a-whatsapp',  label: 'Talk to support on WhatsApp',   icon: MessageCircle,            group: 'Actions',                                                                   perform: () => {
        track('command_palette_action', { type: 'whatsapp' });
        window.open('https://wa.me/447432112438?text=' + encodeURIComponent("Hi! I'd like to book a move with FlyttGo."), '_blank', 'noreferrer');
        onClose();
      } },
      ...(user
        ? [{ id: 'a-signout', label: 'Sign out', icon: Users, group: 'Actions' as const, perform: () => { void signOut(); onClose(); } }]
        : [
            { id: 'a-signin', label: 'Sign in',  icon: Users, group: 'Actions' as const, perform: () => { setAuthMode('signin'); setShowAuthModal(true); onClose(); } },
            { id: 'a-signup', label: 'Sign up',  icon: Users, group: 'Actions' as const, perform: () => { setAuthMode('signup'); setShowAuthModal(true); onClose(); } },
          ]),
    ];

    const compareItems: CommandItem[] = compare.length > 0 ? [
      {
        id: 'c-open',
        label: `Open compare (${compare.length}/3)`,
        hint: compare.map(c => c.name).join(' · '),
        icon: GitCompare,
        group: 'Compare',
        perform: () => {
          track('command_palette_action', { type: 'open_compare' });
          /* The compare drawer reads the same store; clicking the
           * existing CompareBar 'Compare' button opens it. We
           * dispatch a synthetic event so any listening UI opens. */
          window.dispatchEvent(new CustomEvent('flyttgo:open-compare'));
          onClose();
        },
      },
    ] : [];

    const savedItems: CommandItem[] = saved.slice(0, 5).map(q => ({
      id:    `s-${q.id}`,
      label: `${q.country.toUpperCase()} · ${q.pickupAddress.split(',')[0]} → ${q.dropoffAddress.split(',')[0]}`,
      hint:  'Resume saved quote',
      icon:  Bookmark,
      group: 'Saved',
      perform: () => {
        track('command_palette_action', { type: 'resume_saved', country: q.country });
        /* MyBookings has the actual resume logic; the simplest path
         * here is to navigate to /my-bookings and let the customer
         * click Resume — keeps the palette dependency-light. */
        onClose();
        setPage('my-bookings');
      },
    }));

    return [...markets, ...pages, ...actions, ...compareItems, ...savedItems];
  }, [setPage, setShowAuthModal, setAuthMode, signOut, user, compare, saved, onClose]);

  /* ── Filter + score ──────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      /* No query → recents block first, then everything else. */
      const recentSet = new Set(recents);
      const ranked = [
        ...recents.map(id => catalogue.find(c => c.id === id)).filter(Boolean) as CommandItem[],
        ...catalogue.filter(c => !recentSet.has(c.id)),
      ];
      return ranked;
    }
    const tokens = q.split(/\s+/).filter(Boolean);
    return catalogue
      .map(c => {
        const haystack = [c.label, c.hint, c.group, ...(c.keywords ?? [])]
          .filter(Boolean).join(' ').toLowerCase();
        const score = tokens.reduce((s, tok) => {
          const i = haystack.indexOf(tok);
          if (i < 0) return -1;
          if (s < 0) return s;
          /* Earlier matches score higher. Label prefix scores best. */
          const labelI = c.label.toLowerCase().indexOf(tok);
          return s + (labelI === 0 ? 100 : labelI > 0 ? 50 : 10) - i;
        }, 0);
        return { c, score };
      })
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.c);
  }, [query, catalogue, recents]);

  /* Reset active row when the result set changes. */
  useEffect(() => { setActive(0); }, [query]);

  /* Keyboard navigation inside the palette. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
      else if (e.key === 'Enter')     {
        const item = filtered[active];
        if (item) {
          rememberRecent(item.id);
          item.perform();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, active]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search FlyttGo"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center pt-20 sm:pt-0 px-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-listbox"
            aria-activedescendant={filtered[active]?.id}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search countries, pages, actions…"
            className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
          />
          <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 border border-slate-300 rounded text-slate-500">
            ESC
          </kbd>
        </div>

        <ul
          id="command-palette-listbox"
          role="listbox"
          className="max-h-[60vh] overflow-y-auto py-2"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500 text-center">
              Nothing matches "<span className="text-slate-900 font-semibold">{query}</span>".
              Try <kbd className="text-[10px] font-mono px-1 py-0.5 border border-slate-300 rounded">help</kbd> or <kbd className="text-[10px] font-mono px-1 py-0.5 border border-slate-300 rounded">support</kbd>.
            </li>
          ) : (
            filtered.map((item, i) => {
              const isActive = i === active;
              const showGroup =
                i === 0 || filtered[i - 1].group !== item.group;
              return (
                <React.Fragment key={item.id}>
                  {showGroup && (
                    <li className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {item.group}
                    </li>
                  )}
                  <li
                    id={item.id}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => { rememberRecent(item.id); item.perform(); }}
                    className={`mx-2 my-0.5 px-3 py-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
                      isActive ? 'bg-brand-50 text-ink-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {item.flag ? (
                      <span className="text-lg leading-none w-5 text-center" aria-hidden>{item.flag}</span>
                    ) : item.icon ? (
                      <item.icon size={16} className={isActive ? 'text-brand-600' : 'text-slate-400'} />
                    ) : (
                      <span className="w-4" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{item.label}</div>
                      {item.hint && (
                        <div className={`text-xs truncate ${isActive ? 'text-ink-700' : 'text-slate-400'}`}>
                          {item.hint}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <ArrowRight size={14} className="text-brand-600 flex-shrink-0" />
                    )}
                    {item.shortcut && (
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 border border-slate-300 rounded text-slate-500">
                        {item.shortcut}
                      </kbd>
                    )}
                  </li>
                </React.Fragment>
              );
            })
          )}
        </ul>

        <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-slate-200 bg-surface-soft text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono px-1 py-0.5 border border-slate-300 rounded">↑</kbd>
              <kbd className="font-mono px-1 py-0.5 border border-slate-300 rounded">↓</kbd> to navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono px-1 py-0.5 border border-slate-300 rounded">⏎</kbd> to select
            </span>
          </div>
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Recents persistence ──────────────────────────────────────── */

function readRecents(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(0, RECENTS_MAX) : [];
  } catch { return []; }
}

function rememberRecent(id: string): void {
  if (typeof window === 'undefined') return;
  const existing = readRecents().filter(x => x !== id);
  const next = [id, ...existing].slice(0, RECENTS_MAX);
  window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

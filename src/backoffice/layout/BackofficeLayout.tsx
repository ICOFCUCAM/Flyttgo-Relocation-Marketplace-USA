import { type ReactNode } from 'react';
import {
  LayoutDashboard, Globe, Wallet, BookOpenCheck, Receipt,
  ShieldCheck, ScrollText, Flag, ShieldAlert, ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../lib/store';
import { useAuth } from '../../lib/auth';
import { useBackofficeAuth } from '../rbac/useBackofficeAuth';
import { PAGE_PERMISSIONS, ROLE_LABELS } from '../rbac/permissions';
import { type BosSlug } from '../routes';

interface NavItem {
  slug:  BosSlug;
  label: string;
  icon:  typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { slug: 'dashboard',      label: 'Dashboard',       icon: LayoutDashboard },
  { slug: 'markets',        label: 'Market Rollout',  icon: Globe },
  { slug: 'payments',       label: 'Central Payments',icon: Wallet },
  { slug: 'accounting',     label: 'US Accounting',   icon: BookOpenCheck },
  { slug: 'invoices',       label: 'Invoices',        icon: Receipt },
  { slug: 'feature-flags',  label: 'Feature Flags',   icon: Flag },
  { slug: 'super-admin',    label: 'Super Admin',     icon: ShieldCheck },
  { slug: 'audit-log',      label: 'Audit Log',       icon: ScrollText },
];

interface Props {
  activeSlug: BosSlug;
  onNavigate: (slug: BosSlug) => void;
  children:   ReactNode;
}

/* ─────────────────────────────────────────────────────────────────
 * <BackofficeLayout>
 *
 * Two-column shell: a fixed left sidebar with role-aware navigation
 * and a main content area. The sidebar hides nav items the current
 * user can't reach (via PAGE_PERMISSIONS lookup) so an accountant
 * doesn't see the Super Admin entry.
 *
 * Renders three top-level states:
 *   1. Loading auth context — a thin spinner row.
 *   2. Authenticated user without any BOS role — denial panel with
 *      a "Back to FlyttGo" link.
 *   3. Authenticated BOS user — the full shell.
 * ───────────────────────────────────────────────────────────────── */

export default function BackofficeLayout({ activeSlug, onNavigate, children }: Props) {
  const { setPage } = useApp();
  const { user } = useAuth();
  const auth = useBackofficeAuth();

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || auth.roles.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <ShieldAlert size={36} className="mx-auto text-amber-500 mb-3" />
          <h1 className="text-xl font-extrabold text-slate-900 mb-2 tracking-tight">Back-Office access</h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            This area is restricted to FlyttGo operators with an assigned
            back-office role. If you should have access, ask a Super Admin
            to assign you a role.
          </p>
          <button
            onClick={() => setPage('home')}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
          >
            <ArrowLeft size={14} /> Back to FlyttGo
          </button>
        </div>
      </div>
    );
  }

  const visibleNav = NAV.filter(item => {
    const reqPerm = PAGE_PERMISSIONS[item.slug];
    return !reqPerm || auth.hasPermission(reqPerm);
  });

  const primaryRoleLabel = ROLE_LABELS[auth.roles[0]] ?? auth.roles[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#0b1f3a] text-white border-r border-white/5">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center font-extrabold">F</div>
            <div className="leading-tight">
              <p className="text-sm font-extrabold tracking-tight">FlyttGo</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80 font-bold">Back Office</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Back-office navigation">
          {visibleNav.map(item => {
            const Icon = item.icon;
            const active = item.slug === activeSlug;
            return (
              <button
                key={item.slug}
                onClick={() => onNavigate(item.slug)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-left transition ${
                  active
                    ? 'bg-amber-400/15 text-amber-200 border border-amber-300/30'
                    : 'text-white/75 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} className={active ? 'text-amber-300' : 'text-white/60'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Role + sign-out / back link */}
        <div className="border-t border-white/10 p-4 text-xs">
          <p className="text-white/55 mb-1">Signed in as</p>
          <p className="text-white font-semibold truncate">{user.email}</p>
          <p className="text-amber-300 font-bold mt-1">{primaryRoleLabel}</p>
          {auth.isSuperAdmin && (
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-amber-400/20 text-amber-200 font-bold">
              Wildcard
            </span>
          )}
          <button
            onClick={() => setPage('home')}
            className="mt-3 inline-flex items-center gap-1.5 text-white/65 hover:text-amber-300 transition"
          >
            <ArrowLeft size={12} /> Customer site
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <main className="flex-1 min-w-0">
        {/* Top bar — mobile-only sidebar substitute. */}
        <div className="lg:hidden bg-[#0b1f3a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-amber-400 text-slate-900 flex items-center justify-center font-extrabold text-xs">F</div>
            <span className="font-extrabold text-sm">FlyttGo Back Office</span>
          </div>
          <select
            className="bg-white/10 border border-white/20 rounded-md px-2 py-1 text-xs"
            value={activeSlug}
            onChange={e => onNavigate(e.target.value as BosSlug)}
          >
            {visibleNav.map(item => (
              <option key={item.slug} value={item.slug} className="text-slate-900">
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

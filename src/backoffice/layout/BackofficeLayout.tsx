import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard, Globe, Wallet, BookOpenCheck, Receipt,
  ShieldCheck, ScrollText, Flag, ShieldAlert, ArrowLeft, LogOut, LogIn,
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
  const { user, signOut } = useAuth();
  const auth = useBackofficeAuth();

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <BackofficeSignInPanel onCancel={() => setPage('home')} />;
  }

  if (auth.roles.length === 0) {
    return (
      <BackofficeNoRolePanel
        email={user.email ?? ''}
        onBack={() => setPage('home')}
        onSignOut={async () => { await signOut(); setPage('home'); }}
      />
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
          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={() => setPage('home')}
              className="inline-flex items-center gap-1.5 text-white/65 hover:text-amber-300 transition"
            >
              <ArrowLeft size={12} /> Customer site
            </button>
            <button
              onClick={async () => { await signOut(); setPage('home'); }}
              className="inline-flex items-center gap-1.5 text-white/65 hover:text-rose-300 transition"
            >
              <LogOut size={12} /> Sign out
            </button>
          </div>
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

/**
 * <BackofficeSignInPanel> — what unauthenticated visitors land on
 * when they hit /backoffice. Inline email + password form so the
 * operator doesn't have to bounce to the public site, sign in via
 * the customer modal, and navigate back. Branded with the FlyttGo
 * mark on a dark slate panel so it visually reads as "back office"
 * rather than the public storefront.
 */
function BackofficeSignInPanel({ onCancel }: { onCancel: () => void }) {
  const { signIn } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await signIn(email.trim(), password);
    setBusy(false);
    if (res.error) setError(res.error.message ?? 'Sign in failed.');
    /* On success the auth context updates and BackofficeLayout
     * re-renders into the proper role-aware shell. No redirect
     * needed. */
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-[#0b1f3a] text-white px-8 py-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center font-extrabold">F</div>
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-300 font-bold">FlyttGo</p>
              <p className="text-sm font-extrabold tracking-tight">Back Office</p>
            </div>
          </div>
          <h1 className="text-lg font-extrabold mb-1">Operator sign in</h1>
          <p className="text-xs text-white/70 leading-relaxed">
            Restricted area. Access events are recorded in the audit log.
          </p>
        </div>

        <form onSubmit={submit} className="px-8 py-6 space-y-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 mb-1 block">Email</span>
            <input
              type="email"
              autoFocus
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@flyttgo.com"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700 mb-1 block">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>
          {error && <p className="text-rose-600 text-xs" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-200 disabled:text-slate-500 text-slate-900 px-4 py-2.5 rounded-md text-sm font-bold transition mt-2"
          >
            <LogIn size={14} /> {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full inline-flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 text-xs mt-2"
          >
            <ArrowLeft size={12} /> Back to FlyttGo
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * <BackofficeNoRolePanel> — shown when a customer-only account
 * lands on /backoffice. Different copy + actions than the signed-out
 * panel so the operator can clearly see (a) which account they're
 * authenticated as, (b) sign out to switch accounts, or (c) leave.
 */
function BackofficeNoRolePanel({
  email, onBack, onSignOut,
}: {
  email:     string;
  onBack:    () => void;
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
        <ShieldAlert size={36} className="mx-auto text-amber-500 mb-3" />
        <h1 className="text-xl font-extrabold text-slate-900 mb-2 tracking-tight">Back-Office access</h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-2">
          Signed in as <span className="font-bold text-slate-900">{email}</span>.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          This account doesn't have a back-office role. Ask a Super Admin
          to assign one — or sign out and use a different account.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
          >
            <ArrowLeft size={14} /> Back to FlyttGo
          </button>
          <button
            onClick={() => { void onSignOut(); }}
            className="inline-flex items-center justify-center gap-2 text-slate-500 hover:text-rose-600 text-xs"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

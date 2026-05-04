import { ADMIN_TABS, type AdminTab } from './types';

/* ─────────────────────────────────────────────────────────────────
 * <AdminSidebar>
 *
 * Left navigation rail for the admin dashboard. Brand-aligned (ink
 * navy + amber accent — consistent with the rest of the marketplace
 * after the emerald → amber sweep). The optional `pendingCounts`
 * prop renders a numeric badge next to a tab when there's anything
 * needing the admin's attention (e.g. new driver applications) so
 * the queue is impossible to miss from any other tab.
 * ───────────────────────────────────────────────────────────────── */

export interface AdminSidebarBadges {
  /** Per-tab pending count. Tabs without a count don't render a badge. */
  applications?: number;
  bookings?:     number;
  disputes?:     number;
}

export function AdminSidebar({
  current,
  onSelect,
  badges = {},
}: {
  current:  AdminTab;
  onSelect: (tab: AdminTab) => void;
  badges?:  AdminSidebarBadges;
}) {
  return (
    <aside className="w-64 bg-ink-900 text-white flex-shrink-0 flex flex-col">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30">
            <svg className="w-4 h-4 text-ink-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1 2 1 2-1 2 1 2-1zm0 0l2 1 2-1 2 1V6a1 1 0 00-1-1h-4"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-tight">FlyttGo</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300 font-bold">Admin</p>
          </div>
        </div>
      </div>

      <nav aria-label="Admin sections" className="flex-1 py-2">
        {ADMIN_TABS.map(t => {
          const isCurrent = current === t;
          const badge = (badges as Record<string, number | undefined>)[t];
          return (
            <button
              key={t}
              onClick={() => onSelect(t)}
              aria-current={isCurrent ? 'page' : undefined}
              className={`flex items-center justify-between w-full text-left px-6 py-3 capitalize text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset ${
                isCurrent
                  ? 'bg-amber-400 text-ink-900'
                  : 'text-white/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{t}</span>
              {typeof badge === 'number' && badge > 0 && (
                <span className={`tabular-nums text-[10px] font-extrabold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center ${
                  isCurrent
                    ? 'bg-ink-900 text-amber-300'
                    : 'bg-amber-400 text-ink-900 shadow shadow-amber-500/40'
                }`}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

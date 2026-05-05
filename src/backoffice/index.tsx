import { useEffect, useState } from 'react';
import BackofficeLayout from './layout/BackofficeLayout';
import StepUpAuthGate from '../accounting/components/StepUpAuthGate';
import { readBosSlug, bosSlugPath, type BosSlug } from './routes';

import DashboardPage         from './pages/DashboardPage';
import MarketRolloutPage     from './pages/MarketRolloutPage';
import PaymentsPage          from './pages/PaymentsPage';
import AccountingWorkspace   from '../pages/AccountingWorkspace';
import AuditWorkspace        from '../pages/AuditWorkspace';
import InvoicesPage          from './pages/InvoicesPage';
import SuperAdminPage        from './pages/SuperAdminPage';
import AuditLogPage          from './pages/AuditLogPage';
import FeatureFlagsPage      from './pages/FeatureFlagsPage';

/* ─────────────────────────────────────────────────────────────────
 * Back-Office root
 *
 * Single Page id ('backoffice') in the global router; the sub-page
 * is encoded in the URL pathname (/backoffice/markets, /backoffice/
 * payments, …) and dispatched here. Mirrors the existing
 * ServiceCategoryPage / CorridorPage / MovingCityPage pattern so
 * adding the BOS doesn't introduce a second routing system.
 * ───────────────────────────────────────────────────────────────── */

export default function Backoffice() {
  const [slug, setSlug] = useState<BosSlug>(() => readBosSlug());

  /* Re-resolve the slug when the user navigates with back/forward. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPop = () => setSlug(readBosSlug());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (next: BosSlug) => {
    if (next === slug) return;
    setSlug(next);
    if (typeof window !== 'undefined') {
      const path = bosSlugPath(next);
      if (window.location.pathname !== path) {
        window.history.pushState({ bos: next }, '', path);
      }
    }
  };

  return (
    /* Single step-up gate at the back-office umbrella. One password
     * confirmation unlocks every sub-route (accounting, audit,
     * payments, super-admin etc.) for 30 minutes — the operator
     * doesn't have to re-confirm jumping between sections. */
    <StepUpAuthGate workspace="backoffice" workspaceLabel="Back office">
      <BackofficeLayout activeSlug={slug} onNavigate={navigate}>
        {(() => {
          switch (slug) {
            case 'dashboard':       return <DashboardPage />;
            case 'markets':         return <MarketRolloutPage />;
            case 'payments':        return <PaymentsPage />;
            case 'accounting':      return <AccountingWorkspace />;
            case 'audit':           return <AuditWorkspace />;
            case 'invoices':        return <InvoicesPage />;
            case 'super-admin':     return <SuperAdminPage />;
            case 'audit-log':       return <AuditLogPage />;
            case 'feature-flags':   return <FeatureFlagsPage />;
            default:                return <DashboardPage />;
          }
        })()}
      </BackofficeLayout>
    </StepUpAuthGate>
  );
}

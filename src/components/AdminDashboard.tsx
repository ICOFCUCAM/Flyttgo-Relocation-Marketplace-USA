import { useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useAdminSnapshot } from '../hooks/queries/useAdminDashboard';
import { AdminSidebar } from './admin/AdminSidebar';
import type { AdminTab, AdminPanelHandlers } from './admin/types';
import { OverviewTab }     from './admin/tabs/OverviewTab';
import { FleetMapTab }     from './admin/tabs/FleetMapTab';
import { DriversTab }      from './admin/tabs/DriversTab';
import { BookingsTab }     from './admin/tabs/BookingsTab';
import { ApplicationsTab } from './admin/tabs/ApplicationsTab';
import { RevenueTab }      from './admin/tabs/RevenueTab';
import { DisputesTab }     from './admin/tabs/DisputesTab';
import { MatcherTab }      from './admin/tabs/MatcherTab';
import { SettingsTab }     from './admin/tabs/SettingsTab';
import { ApplicationDocsPanel }   from './admin/modals/ApplicationDocsPanel';
import { ManualRefundPanel }      from './admin/modals/ManualRefundPanel';
import { BookingTimelinePanel }   from './admin/modals/BookingTimelinePanel';
import { ManualDispatchModal }    from './admin/modals/ManualDispatchModal';
import type { BookingRow, ApplicationRow, DriverRow } from '../services/admin';
import type { DriverDocsContext } from './admin/modals/ApplicationDocsPanel';

/**
 * AdminDashboard — orchestration shell.
 *
 * Owns: tab selection, cross-tab modal/panel state, the admin gate.
 * Delegates: data fetching to useAdminSnapshot, every domain action to
 * the dedicated tab components, modal rendering to the panel
 * components in ./admin/modals/.
 */
export default function AdminDashboard() {
  const { profile, loading } = useAuth();
  const isAdmin = !loading && profile?.role === 'admin';

  const [tab, setTab] = useState<AdminTab>('overview');

  /* Cross-tab modal state — these panels are reachable from multiple
   * tabs (e.g. the bookings tab opens the manual-dispatch modal,
   * applications opens the docs panel) so they live at the shell. */
  const [refundBooking,     setRefundBooking]     = useState<BookingRow | null>(null);
  const [dispatchBooking,   setDispatchBooking]   = useState<BookingRow | null>(null);
  const [timelineBookingId, setTimelineBookingId] = useState<string | null>(null);
  /* Single docs-modal state that handles both surfaces:
   *   Applications tab → context.applicationId is set
   *   Drivers tab      → context.applicationId is null */
  const [docsContext,       setDocsContext]       = useState<DriverDocsContext | null>(null);

  const handlers: AdminPanelHandlers = useMemo(() => ({
    openManualRefund:    setRefundBooking,
    openManualDispatch:  setDispatchBooking,
    openTimeline:        setTimelineBookingId,
    openApplicationDocs: (app: ApplicationRow) => setDocsContext({
      userId:        app.user_id ?? '',
      applicationId: app.id,
      displayName:   [app.first_name, app.last_name].filter(Boolean).join(' ') || 'Unnamed applicant',
      contextLabel:  `Application · ${app.status}`,
      vehicleType:   app.vehicle_type ?? null,
      vehicleYear:   app.vehicle_year ?? null,
      /* Hand the docs modal both the legacy cram-string and the
       * structured columns; readApplicationCompliance prefers the
       * structured ones when present. */
      compliance: {
        vehicle_model:         app.vehicle_model ?? null,
        provider_category:     app.provider_category ?? null,
        usdot_number:          app.usdot_number ?? null,
        mc_number:             app.mc_number ?? null,
        cargo_insurance:       app.cargo_insurance ?? null,
        gvol_number:           app.gvol_number ?? null,
        gukg_licence:          app.gukg_licence ?? null,
        yrkestransport:        app.yrkestransport ?? null,
        siret:                 app.siret ?? null,
        tva:                   app.tva ?? null,
        ca_provincial_licence: app.ca_provincial_licence ?? null,
      },
    }),
    openDriverDocs:      (driver: DriverRow) => setDocsContext({
      userId:        driver.user_id ?? driver.id,
      applicationId: null,
      displayName:   driver.full_name || 'Unnamed driver',
      contextLabel:  `Active driver · ${driver.status ?? 'unknown'}`,
    }),
  }), []);

  const { data: snapshot } = useAdminSnapshot(isAdmin);

  /* Sidebar badges — drives the at-a-glance counters next to each
   * tab in the rail. Pending applications = anything not yet
   * approved or rejected. Computed defensively so a missing
   * snapshot field doesn't crash the rail. */
  const sidebarBadges = useMemo(() => {
    if (!snapshot) return {};
    const pendingApps = snapshot.applications.filter(
      a => a.status === 'pending' || a.status === 'submitted' || a.status === 'under_review',
    ).length;
    return { applications: pendingApps };
  }, [snapshot]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-500">You need admin credentials to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar current={tab} onSelect={setTab} badges={sidebarBadges} />

      <main className="flex-1 p-6 overflow-auto" aria-live="polite">
        {!snapshot ? (
          <div className="text-sm text-gray-500">Loading control center…</div>
        ) : (
          <>
            {tab === 'overview'     && <OverviewTab data={snapshot} />}
            {tab === 'fleet-map'    && <FleetMapTab />}
            {tab === 'drivers'      && (
              <DriversTab
                drivers={snapshot.drivers}
                driverSubExpiry={snapshot.driverSubExpiry}
                handlers={handlers}
              />
            )}
            {tab === 'bookings'     && (
              <BookingsTab bookings={snapshot.bookings} handlers={handlers} />
            )}
            {tab === 'applications' && (
              <ApplicationsTab
                applications={snapshot.applications}
                applicationDocStatus={snapshot.applicationDocStatus}
                handlers={handlers}
              />
            )}
            {tab === 'revenue'      && <RevenueTab stats={snapshot.revenueStats} />}
            {tab === 'disputes'     && <DisputesTab />}
            {tab === 'matcher'      && <MatcherTab />}
            {tab === 'settings'     && <SettingsTab enabled={isAdmin} />}
          </>
        )}
      </main>

      {/* Modals + side panels */}
      {docsContext && (
        <ApplicationDocsPanel
          context={docsContext}
          onClose={() => setDocsContext(null)}
        />
      )}
      {refundBooking && (
        <ManualRefundPanel
          booking={refundBooking}
          onClose={() => setRefundBooking(null)}
        />
      )}
      {timelineBookingId && (
        <BookingTimelinePanel
          bookingId={timelineBookingId}
          onClose={() => setTimelineBookingId(null)}
        />
      )}
      {dispatchBooking && snapshot && (
        <ManualDispatchModal
          booking={dispatchBooking}
          drivers={snapshot.drivers}
          onClose={() => setDispatchBooking(null)}
        />
      )}
    </div>
  );
}

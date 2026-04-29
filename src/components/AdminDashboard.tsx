import React, { useMemo, useState } from 'react';
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
import type { BookingRow, ApplicationRow } from '../services/admin';

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
  const [docsApplication,   setDocsApplication]   = useState<ApplicationRow | null>(null);

  const handlers: AdminPanelHandlers = useMemo(() => ({
    openManualRefund:    setRefundBooking,
    openManualDispatch:  setDispatchBooking,
    openTimeline:        setTimelineBookingId,
    openApplicationDocs: setDocsApplication,
  }), []);

  const { data: snapshot } = useAdminSnapshot(isAdmin);

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
      <AdminSidebar current={tab} onSelect={setTab} />

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
      {docsApplication && (
        <ApplicationDocsPanel
          application={docsApplication}
          onClose={() => setDocsApplication(null)}
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

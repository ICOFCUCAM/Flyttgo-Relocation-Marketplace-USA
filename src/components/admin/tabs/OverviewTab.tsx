import { Card } from '../Card';
import { Inbox } from 'lucide-react';
import type { AdminDashboardSnapshot } from '../../../services/admin';

export function OverviewTab({ data }: { data: AdminDashboardSnapshot }) {
  const {
    drivers, bookings, applications, customerCount,
    activeDrivers, activeBookings, totalRevenue,
    fleetCapacity, delayedBookingsCount, highValueBookingsCount,
    dispatchOverload, recentActivity, bookingPipeline,
    driverStatusStats, revenueStats,
  } = data;

  /* Pending applications = anything not yet approved or rejected.
   * Promoted as a top-of-page alert so a queue forming during a
   * busy week is impossible to miss from the overview tab. */
  const pendingApplicationsCount = applications.filter(
    a => a.status === 'pending' || a.status === 'submitted' || a.status === 'under_review',
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">FlyttGo Operations Control Center</h1>
      {pendingApplicationsCount > 0 && (
        <div role="alert" className="mb-4 bg-amber-50 border border-amber-300 text-amber-900 px-6 py-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-ink-900 flex items-center justify-center flex-shrink-0 shadow shadow-amber-500/30">
            <Inbox size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-amber-900">
              {pendingApplicationsCount} driver application{pendingApplicationsCount === 1 ? '' : 's'} awaiting review
            </p>
            <p className="text-xs text-amber-700">
              Open the <span className="font-bold">Applications</span> tab in the rail to approve or reject.
            </p>
          </div>
        </div>
      )}
      {fleetCapacity === 'LOW' && (
        <div role="alert" className="mb-4 bg-red-50 border border-red-300 text-red-700 px-6 py-4 rounded-lg">
          <strong>⚠️ Driver shortage detected</strong>
        </div>
      )}
      {delayedBookingsCount > 0 && (
        <div role="alert" className="mb-4 bg-yellow-50 border border-yellow-300 text-yellow-800 px-6 py-4 rounded-lg">
          ⚠️ <strong>{delayedBookingsCount} delayed bookings</strong> waiting assignment for over 10 minutes
        </div>
      )}
      {highValueBookingsCount > 0 && (
        <div className="mb-4 bg-purple-50 border border-purple-300 text-purple-800 px-6 py-4 rounded-lg">
          💎 <strong>{highValueBookingsCount} high-value bookings</strong> (3000+ USD) waiting drivers
        </div>
      )}
      {dispatchOverload && (
        <div role="alert" className="mb-4 bg-orange-50 border border-orange-300 text-orange-800 px-6 py-4 rounded-lg">
          🚨 <strong>Dispatch overload:</strong> More confirmed bookings than online drivers
        </div>
      )}

      <h2 className="mt-6 font-bold text-gray-700">Driver Status Monitor</h2>
      <div className="grid grid-cols-4 gap-4 mt-2">
        <Card title="Online Drivers" value={driverStatusStats.online} isCurrency={false} />
        <Card title="Busy Drivers" value={driverStatusStats.busy} isCurrency={false} />
        <Card title="Pending Approval" value={driverStatusStats.pending} isCurrency={false} />
        <Card title="Suspended Drivers" value={driverStatusStats.suspended} isCurrency={false} />
      </div>

      <h2 className="mt-8 font-bold text-gray-700">Fleet Capacity</h2>
      <div className="bg-white rounded p-6 flex items-center justify-between mt-2">
        <p className="text-2xl font-bold">
          {fleetCapacity === 'HIGH'
            ? '🟢 HIGH CAPACITY'
            : fleetCapacity === 'MEDIUM'
              ? '🟡 MEDIUM CAPACITY'
              : '🔴 LOW CAPACITY'}
        </p>
        <div className="text-sm text-gray-400">Based on online drivers vs active bookings</div>
      </div>

      <h2 className="mt-8 font-bold text-gray-700">Platform Metrics</h2>
      <div className="grid grid-cols-4 gap-4 mt-2">
        <Card title="Drivers" value={drivers.length} isCurrency={false} />
        <Card title="Bookings" value={bookings.length} isCurrency={false} />
        <Card title="Applications" value={applications.length} isCurrency={false} />
        <Card title="Customers" value={customerCount} isCurrency={false} />
        <Card title="Active Drivers" value={activeDrivers} isCurrency={false} />
        <Card title="Active Bookings" value={activeBookings} isCurrency={false} />
        <Card title="Total Revenue" value={totalRevenue} />
      </div>

      <h2 className="mt-8 font-bold text-gray-700">Booking Pipeline</h2>
      <div className="grid grid-cols-3 gap-4 mt-2">
        <Card title="Pending" value={bookingPipeline.pending} isCurrency={false} />
        <Card title="Confirmed" value={bookingPipeline.confirmed} isCurrency={false} />
        <Card title="Driver Assigned" value={bookingPipeline.assigned} isCurrency={false} />
        <Card title="In Transit" value={bookingPipeline.inTransit} isCurrency={false} />
        <Card title="Completed Today" value={bookingPipeline.completedToday} isCurrency={false} />
        <Card title="Cancelled Today" value={bookingPipeline.cancelledToday} isCurrency={false} />
      </div>

      <h2 className="mt-8 font-bold text-gray-700">Revenue Dashboard</h2>
      <div className="grid grid-cols-3 gap-4 mt-2">
        <Card title="Today" value={revenueStats.today} />
        <Card title="Week" value={revenueStats.week} />
        <Card title="Month" value={revenueStats.month} />
        <Card title="Commission" value={revenueStats.totalCommission} />
        <Card title="Escrow Pending" value={revenueStats.pendingEscrow} />
        <Card title="Released" value={revenueStats.releasedToDrivers} />
      </div>

      <h2 className="mt-8 font-bold text-gray-700">Recent Activity</h2>
      <div className="bg-white rounded p-4 mt-2">
        {recentActivity.length === 0 ? (
          <div className="text-gray-500 text-sm">No recent activity yet</div>
        ) : (
          recentActivity.map(item => (
            <div key={item.id} className="border-b py-2 text-sm">{item.message}</div>
          ))
        )}
      </div>
    </div>
  );
}

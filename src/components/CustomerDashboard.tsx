import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth";
import { useApp } from "../lib/store";
import {
  useCustomerBookings,
  useActiveBookingEscrow,
  useConfirmCompletion,
  useApproveEscrowAdjustment,
  useCancelBooking,
} from "../hooks/queries/useCustomerBookings";

/* Lazy-load Leaflet so the ~150 KB map bundle is only fetched when
 * there's actually an in-flight booking to render. MyBookings uses
 * the same pattern. */
const DriverTrackingMap = lazy(() => import("./DriverTrackingMap"));

/** Booking status values where a driver is en route and a live map
 *  is useful. Pending / confirmed / cancelled / completed don't get
 *  one — either there's no driver assigned yet or the trip is over. */
const IN_FLIGHT_STATUSES = new Set([
  "driver_assigned",
  "pickup_arrived",
  "loading",
  "in_transit",
]);

/**
 * SessionStorage key used to hand off a specific booking id to
 * PaymentPage. When the user clicks "Complete Payment" on a row in
 * the dashboard / my-bookings, we stash the id here so PaymentPage
 * can load exactly that booking instead of falling back to the
 * most-recent pending one (which would be wrong if the user has
 * multiple unfinished drafts).
 */
const PAYMENT_HANDOFF_KEY = "flyttgo:payment-booking-id";

function fmt(value: unknown): string {
  const n = Number(value ?? 0);
  return String(Math.floor(Number.isNaN(n) ? 0 : n));
}

export default function CustomerDashboard() {
  const { profile, user } = useAuth();
  const { setPage } = useApp();
  const { t } = useTranslation();

  const { data: view, isLoading } = useCustomerBookings(user?.id);
  const stats           = view?.stats   ?? { total: 0, active: 0, completed: 0, spent: 0 };
  const recentBookings  = view?.recent  ?? [];
  const activeBooking   = view?.active  ?? null;
  const { data: escrowAdjustment } = useActiveBookingEscrow(activeBooking?.id ?? null);

  const confirmCompletionMut = useConfirmCompletion(user?.id);
  const approveAdjustmentMut = useApproveEscrowAdjustment(user?.id);
  const cancelBookingMut     = useCancelBooking(user?.id);

  function confirmCompletion(bookingId: string) {
    confirmCompletionMut.mutate(bookingId, {
      onSuccess: ({ driverDone }) => {
        alert(driverDone
          ? "Job complete! Payment released to driver."
          : "Confirmed! Waiting for driver confirmation.");
      },
    });
  }

  function approveAdjustment(escrowId: string) {
    approveAdjustmentMut.mutate(escrowId, {
      onSuccess: () => alert("Additional time charge approved"),
    });
  }

  function cancelActiveBooking(bookingId: string) {
    cancelBookingMut.mutate(bookingId, {
      onSuccess: () => alert("Booking cancelled"),
    });
  }

  /** Hand the user off to the payment page with this booking preselected. */
  function goToPayment(bookingId: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PAYMENT_HANDOFF_KEY, bookingId);
    }
    setPage("payment");
  }

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-700 font-semibold mb-2">Please sign in to view your dashboard</p>
        <button onClick={() => setPage("home")} className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-xl">Go to Home</button>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 animate-pulse">
        {/* Title skeleton */}
        <div className="h-7 w-56 bg-gray-200 rounded-md mb-2" />
        <div className="h-4 w-72 bg-gray-200 rounded-md mb-8" />
        {/* Stat cards row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
              <div className="h-7 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        {/* Recent bookings skeleton */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
          {[0, 1, 2].map(i => (
            <div key={i} className="border-b border-gray-100 last:border-0 py-4">
              <div className="h-4 w-1/2 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-1/3 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.welcome', { name: profile?.first_name || 'Customer' })}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.trackMove')}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[{ label: t('dashboard.totalBookings'), value: stats.total }, { label: t('dashboard.active'), value: stats.active }, { label: t('dashboard.completed'), value: stats.completed }, { label: t('dashboard.totalSpent'), value: `${fmt(stats.spent)} USD` }].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 border">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>
        {activeBooking && (
          <div className="bg-white rounded-xl border p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">{t('dashboard.activeBooking')}</h2>
            {/* Payment-required banner — shown whenever the active
             * booking still has payment_status = 'pending'. */}
            {activeBooking.payment_status === "pending" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                <span className="text-yellow-500 text-xl flex-shrink-0">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-yellow-800">{t('dashboard.paymentRequired')}</p>
                  <p className="text-sm text-yellow-700 mt-0.5">
                    {t('dashboard.paymentRequiredDesc')}
                  </p>
                  <button
                    onClick={() => goToPayment(activeBooking.id)}
                    className="mt-3 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                  >
                    {t('dashboard.completePayment')}
                  </button>
                </div>
              </div>
            )}
            <p className="font-medium">{activeBooking.pickup_address} → {activeBooking.dropoff_address}</p>
            <p className="text-sm text-gray-500 mt-2">{t('dashboard.status')}: <strong>{activeBooking.status?.replace(/_/g, " ")}</strong></p>
            <p className="text-sm text-gray-500">{t('dashboard.estimatedHours')}: <strong>{activeBooking.estimated_hours ?? "-"}</strong></p>
            <p className="text-sm text-gray-500">{t('dashboard.actualHours')}: <strong>{activeBooking.actual_hours ?? t('dashboard.running')}</strong></p>
            <p className="text-sm text-gray-500">
              {activeBooking.payment_status === "pending"
                ? t('dashboard.escrowNotFunded')
                : t('dashboard.escrowProtected')}
            </p>
            <p className="text-lg font-bold mt-2">{fmt(activeBooking.final_price ?? activeBooking.original_price ?? activeBooking.price_estimate)} USD</p>

            {/* LIVE MAP — only once a driver is actually en route. */}
            {IN_FLIGHT_STATUSES.has(activeBooking.status) &&
              activeBooking.payment_status !== "pending" &&
              activeBooking.pickup_lat && activeBooking.pickup_lng &&
              activeBooking.dropoff_lat && activeBooking.dropoff_lng && (
                <div className="mt-5">
                  <Suspense fallback={<div className="h-72 rounded-xl bg-gray-100 animate-pulse" />}>
                    <DriverTrackingMap
                      pickup={{ lat: Number(activeBooking.pickup_lat), lng: Number(activeBooking.pickup_lng) }}
                      dropoff={{ lat: Number(activeBooking.dropoff_lat), lng: Number(activeBooking.dropoff_lng) }}
                      driverId={activeBooking.driver_id}
                    />
                  </Suspense>
                </div>
              )}

            {/* Action row */}
            <div className="flex flex-wrap gap-3 mt-5">
              {activeBooking.payment_status !== "pending" &&
                activeBooking.status !== "cancelled" &&
                activeBooking.status !== "completed" && (
                  <button
                    onClick={() => setPage("tracking")}
                    className="bg-[#0B2E59] hover:bg-[#1a4a8a] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                  >
                    <span aria-hidden="true">📍</span>
                    {t('dashboard.trackDelivery')}
                  </button>
                )}

              {activeBooking.price_adjusted && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded w-full">
                  <p className="text-orange-700 font-semibold">Extra time detected</p>
                  <p className="text-sm text-orange-600">Final price updated automatically</p>
                </div>
              )}
              {escrowAdjustment?.adjustment_required && !escrowAdjustment.adjustment_approved && (
                <button
                  onClick={() => approveAdjustment(escrowAdjustment.id)}
                  disabled={approveAdjustmentMut.isPending}
                  className="bg-orange-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                >
                  Approve additional time charge
                </button>
              )}
              {activeBooking.status === "completed_by_driver" && (
                <button
                  onClick={() => confirmCompletion(activeBooking.id)}
                  disabled={confirmCompletionMut.isPending}
                  className="bg-amber-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                >
                  Confirm Completion
                </button>
              )}
              {activeBooking.status === "awaiting_driver" && (
                <button
                  onClick={() => cancelActiveBooking(activeBooking.id)}
                  disabled={cancelBookingMut.isPending}
                  className="bg-red-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <button onClick={() => setPage("booking")} className="bg-amber-600 text-white rounded-xl p-5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">{t('dashboard.newBooking')}</button>
          <button onClick={() => setPage("my-bookings")} className="bg-white rounded-xl p-5 border font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">{t('dashboard.myBookings')}</button>
          <button onClick={() => setPage("van-guide")} className="bg-white rounded-xl p-5 border font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">{t('dashboard.vanCalculator')}</button>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-5 border-b"><h2 className="text-lg font-bold">{t('dashboard.recentBookings')}</h2></div>
          {recentBookings.length === 0 ? (<div className="p-8 text-center text-gray-500">{t('dashboard.noBookings')}</div>) : (
            <div className="divide-y">
              {recentBookings.map(b => (
                <div key={b.id} className="p-5 flex justify-between items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{b.pickup_address} → {b.dropoff_address}</p>
                    <p className="text-xs text-gray-500">{b.created_at ? new Date(b.created_at).toLocaleDateString() : "-"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold">{fmt(b.final_price ?? b.original_price ?? b.price_estimate)} USD</p>
                    <span className={`text-xs px-2 py-1 rounded ${b.status === "completed" ? "bg-amber-100 text-amber-700" : b.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{b.status?.replace(/_/g, " ")}</span>
                    {b.payment_status === "pending" && b.status !== "cancelled" && (
                      <button
                        onClick={() => goToPayment(b.id)}
                        className="block mt-2 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                      >
                        Complete Payment →
                      </button>
                    )}
                    {IN_FLIGHT_STATUSES.has(b.status) && (
                      <button
                        onClick={() => setPage("tracking")}
                        className="block mt-2 text-xs font-semibold text-[#0B2E59] hover:text-[#1a4a8a] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                      >
                        <span aria-hidden="true">📍</span> Track →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

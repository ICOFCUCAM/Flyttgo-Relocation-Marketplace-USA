import { useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { PackageSearch, Bookmark, MapPin, Calendar, X, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { useApp } from "../lib/store";
import { EmptyState } from "./ds";
import {
  useMyBookings,
  useCancelBooking,
  useConfirmCompletion,
  useApproveEscrowAdjustment,
} from "../hooks/queries/useCustomerBookings";
import {
  useSavedQuotesStore,
  removeSavedQuote,
  relativeTimeFromMs,
  buildShareUrl,
  type SavedQuote,
} from "../lib/saved-quotes-store";
import { formatCurrency } from "../lib/constants";

/* Lazy-load Leaflet so the map bundle (~150 KB) is only fetched on
 * pages that actually have an in-transit booking to track. */
const DriverTrackingMap = lazy(() => import("./DriverTrackingMap"));

/* Must match the key CustomerDashboard uses when handing a specific
 * booking id off to PaymentPage. See CustomerDashboard.tsx. */
const PAYMENT_HANDOFF_KEY = "flyttgo:payment-booking-id";

function safeNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return isNaN(n) ? 0 : n;
}

function formatDuration(start?: string | null, end?: string | null) {
  if (!start) return "Not started";
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const diff = Math.floor((endTime - startTime) / 1000);
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

/* Local Booking shape kept for documentation of the columns the UI
 * actually reads. The hook returns BookingRow (loose Record-based)
 * and the few helpers below take that wider type. */
import type { BookingRow as Booking } from "../services/bookings";

export default function MyBookings() {
  const { user } = useAuth();
  const { setPage, setBookingData } = useApp();
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");

  const { bookings, escrowMap, isLoading } = useMyBookings(user?.id);
  const cancelMut             = useCancelBooking(user?.id);
  const confirmCompletionMut  = useConfirmCompletion(user?.id);
  const approveAdjustmentMut  = useApproveEscrowAdjustment(user?.id);

  if (!user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Please sign in to view your bookings.</p></div>;

  function cancelBooking(id: string) {
    if (!confirm("Cancel this booking?")) return;
    cancelMut.mutate(id, {
      onSuccess: () => toast.success('Booking cancelled', { description: 'Refund (if any) is processed by ops within 24 hours.' }),
      onError:   e => toast.error('Could not cancel booking', { description: e instanceof Error ? e.message : '' }),
    });
  }

  function confirmCompletion(bookingId: string) {
    confirmCompletionMut.mutate(bookingId, {
      onSuccess: ({ driverDone }) => {
        if (driverDone) {
          toast.success('Job complete', { description: 'Payment released to your driver.' });
        } else {
          toast('Waiting for driver confirmation', {
            description: "We'll release payment as soon as both sides confirm.",
            icon: '⏳',
          });
        }
      },
      onError: e => toast.error('Could not confirm completion', { description: e instanceof Error ? e.message : '' }),
    });
  }

  function approveAdjustment(escrowId: string) {
    approveAdjustmentMut.mutate(escrowId, {
      onError: e => toast.error('Could not approve adjustment', { description: e instanceof Error ? e.message : '' }),
    });
  }

  function repeatBooking(booking: Booking) {
    setBookingData({ pickupAddress: booking.pickup_address, dropoffAddress: booking.dropoff_address, vanType: booking.van_type, step: 2 });
    setPage("booking");
  }

  /** Hand the user off to PaymentPage with this booking preselected.
   *  sessionStorage hands the id across the SPA navigation so the
   *  payment screen loads exactly the row the user clicked, not the
   *  most-recent-pending fallback (which would be wrong when drafts
   *  are stacked up). */
  function completePayment(bookingId: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PAYMENT_HANDOFF_KEY, bookingId);
    }
    setPage("payment");
  }

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  // Keys mirror the bookings.status CHECK constraint values.
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
    driver_assigned: "bg-indigo-100 text-indigo-700", pickup_arrived: "bg-sky-100 text-sky-700",
    loading: "bg-cyan-100 text-cyan-700", in_transit: "bg-purple-100 text-purple-700",
    completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-700",
  };
  const paymentColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600", paid: "bg-blue-100 text-blue-700", escrow: "bg-blue-100 text-blue-700",
    released: "bg-emerald-100 text-emerald-700", refunded: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{t('myBookings.title')}</h1>

        {/* Saved-quote panel — only renders when the customer has at
         * least one saved brief. Persisted to localStorage by the
         * BookingShortcut "Save this quote" button. */}
        <SavedQuotesPanel
          onResume={(q) => {
            setBookingData({
              country:        q.country,
              pickupAddress:  q.pickupAddress,
              dropoffAddress: q.dropoffAddress,
              moveDate:       q.moveDate ?? '',
              paymentMethod:  q.paymentMethod,
              depositAmount:  q.depositAmount,
              cashDueAmount:  q.cashDueAmount,
              distanceKm:      q.distanceKm ?? null,
              durationMinutes: q.durationMinutes ?? null,
              step: 2,
            });
            setPage('booking');
          }}
        />
        <div className="flex flex-wrap gap-2 mb-6">
          {["all","pending","driver_assigned","in_transit","completed","cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded text-sm ${filter === f ? "bg-emerald-600 text-white" : "bg-white border"}`}>{f.replace(/_/g, " ")}</button>
          ))}
        </div>
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-100">
                <div className="flex gap-2 mb-3">
                  <div className="h-5 w-20 bg-gray-200 rounded-full" />
                  <div className="h-5 w-16 bg-gray-200 rounded-full" />
                </div>
                <div className="h-3 w-16 bg-gray-200 rounded mb-1" />
                <div className="h-4 w-1/2 bg-gray-200 rounded mb-3" />
                <div className="h-3 w-16 bg-gray-200 rounded mb-1" />
                <div className="h-4 w-2/3 bg-gray-200 rounded mb-4" />
                <div className="h-6 w-32 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )
        : filtered.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={t('myBookings.noBookings', 'No bookings yet') as string}
            body={
              <span>
                {filter === 'all'
                  ? "You haven't booked a move yet. Pick your country, get an instant quote, and your first booking lands here."
                  : `No bookings match the "${filter.replace(/_/g, ' ')}" filter. Switch back to All to see everything you've booked.`}
              </span>
            }
            primaryAction={{
              label: filter === 'all' ? 'Get a quote' : 'Show all bookings',
              onClick: () => filter === 'all' ? setPage('home') : setFilter('all'),
            }}
            secondaryAction={filter === 'all' ? {
              label: 'How it works',
              onClick: () => setPage('how-it-works'),
            } : undefined}
          />
        )
        : filtered.map(booking => {
          const escrow = escrowMap[booking.id];
          const rawPrice = booking.final_price ?? booking.original_price ?? booking.price_estimate;
          const price = (rawPrice === null || rawPrice === undefined || isNaN(Number(rawPrice))) ? 0 : Number(rawPrice);
          return (
            <div key={booking.id} className="bg-white p-6 rounded-xl border mb-4">
              <div className="flex gap-3 mb-3 flex-wrap">
                <span className={`px-3 py-1 rounded text-xs font-medium ${statusColors[booking.status || ""] || "bg-gray-100 text-gray-600"}`}>{booking.status?.replace(/_/g, " ")}</span>
                <span className={`px-3 py-1 rounded text-xs font-medium ${paymentColors[booking.payment_status || ""] || "bg-gray-100 text-gray-600"}`}>{booking.payment_status}</span>
              </div>
              <div className="mb-3">
                <p className="text-sm text-gray-500">Pickup</p><p className="font-medium">{booking.pickup_address}</p>
                <p className="text-sm text-gray-500 mt-1">Delivery</p><p className="font-medium">{booking.dropoff_address}</p>
              </div>

              {/* Live driver-tracking map — only rendered when the booking
               * is in flight and we have valid coordinates for both ends.
               * The map subscribes to driver_locations via Supabase
               * Realtime; if no driver position has been pushed yet, it
               * still shows pickup → delivery pins. */}
              {(booking.status === 'driver_assigned' || booking.status === 'pickup_arrived' || booking.status === 'loading' || booking.status === 'in_transit') &&
                booking.pickup_lat && booking.pickup_lng && booking.dropoff_lat && booking.dropoff_lng && (
                  <Suspense fallback={<div className="h-72 rounded-xl bg-gray-100 animate-pulse mb-3" />}>
                    <DriverTrackingMap
                      pickup={{ lat: Number(booking.pickup_lat), lng: Number(booking.pickup_lng) }}
                      dropoff={{ lat: Number(booking.dropoff_lat), lng: Number(booking.dropoff_lng) }}
                      driverId={booking.driver_id}
                      className="mb-3"
                    />
                  </Suspense>
              )}
              {booking.move_date && <p className="text-sm text-gray-500 mb-2">Move date: <span className="font-medium">{booking.move_date}</span></p>}
              <div className="text-sm text-gray-600 mb-1">Timer: {formatDuration(booking.start_time, booking.end_time)}</div>
              <div className="text-sm text-gray-600 mb-3">Estimated: {booking.estimated_hours ?? "-"} hrs | Actual: {booking.actual_hours ?? "Running"}</div>
              <div className="text-xl font-bold text-emerald-600 mb-2">{safeNumber(price).toFixed(0)} USD</div>
              {booking.price_adjusted && <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-3"><p className="text-orange-700 text-sm font-semibold">Extra time added — price updated</p></div>}
              {escrow?.adjustment_required && !escrow.adjustment_approved && <button onClick={() => approveAdjustment(escrow.id)} className="mb-3 bg-orange-600 text-white px-4 py-2 rounded text-sm">Approve additional charge</button>}
              {/* Payment-required banner — a pending payment_status
               * means the booking row was inserted by BookingFlow
               * but the user walked away before PaymentPage captured
               * the money. The booking is effectively a draft until
               * they finish checkout. */}
              {booking.payment_status === "pending" && booking.status !== "cancelled" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 flex items-start gap-2">
                  <span className="text-yellow-500 flex-shrink-0">⚠️</span>
                  <div className="flex-1 text-sm">
                    <p className="font-semibold text-yellow-800">{t('myBookings.paymentRequired')}</p>
                    <p className="text-yellow-700 text-xs mt-0.5">{t('myBookings.paymentRequiredDesc')}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-3 flex-wrap">
                {booking.payment_status === "pending" && booking.status !== "cancelled" && (
                  <button
                    onClick={() => completePayment(booking.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-semibold"
                  >
                    {t('myBookings.completePayment')}
                  </button>
                )}
                {booking.status === "pending" && <button onClick={() => cancelBooking(booking.id)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">{t('myBookings.cancel')}</button>}
                {booking.status === "completed" && !booking.customer_confirmation && <button onClick={() => confirmCompletion(booking.id)} className="px-4 py-2 bg-emerald-600 text-white rounded text-sm">{t('myBookings.confirmCompletion')}</button>}
                <button onClick={() => repeatBooking(booking)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">{t('myBookings.repeatBooking')}</button>
              </div>
              <div className="text-xs text-gray-400 mt-3">{t('myBookings.loyaltyPoints')}: {Math.floor(Number(price || 0) / 100)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Saved-quote panel
 *
 * Renders the customer's bookmarked briefs (pickup / drop-off / total)
 * in a compact card grid above the main bookings list. Each card has
 * "Resume" (continues the booking flow with the brief pre-loaded) and
 * "Remove" (deletes the saved entry).
 *
 * Self-suppresses when the store is empty so the layout stays clean
 * for first-time visitors.
 * ───────────────────────────────────────────────────────────────── */
function SavedQuotesPanel({ onResume }: { onResume: (q: SavedQuote) => void }) {
  const quotes = useSavedQuotesStore();
  if (quotes.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bookmark size={16} className="text-amber-600" />
          <h2 className="text-lg font-bold text-slate-900">Saved quotes</h2>
          <span className="text-xs text-slate-500">({quotes.length})</span>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {quotes.map(q => (
          <article
            key={q.id}
            className="relative bg-white border border-slate-200 hover:border-amber-300 hover:shadow-medium rounded-2xl p-4 transition-base ease-marketplace"
          >
            <button
              onClick={() => removeSavedQuote(q.id)}
              aria-label="Remove saved quote"
              className="absolute right-2 top-2 p-1 rounded-md text-slate-400 hover:text-danger-600 hover:bg-slate-100 transition"
            >
              <X size={14} />
            </button>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                {q.country.toUpperCase()}
              </span>
              <span className="text-[10px] text-slate-400">·</span>
              <span className="text-[10px] text-slate-400">{relativeTimeFromMs(q.savedAt)}</span>
            </div>

            <div className="text-sm space-y-1 mb-3">
              <p className="flex items-start gap-1.5 text-slate-700">
                <MapPin size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="truncate">{q.pickupAddress}</span>
              </p>
              <p className="flex items-start gap-1.5 text-slate-700">
                <MapPin size={12} className="text-rose-500 mt-0.5 flex-shrink-0" />
                <span className="truncate">{q.dropoffAddress}</span>
              </p>
              {q.moveDate && (
                <p className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <Calendar size={11} />
                  {q.moveDate}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
              <span className="text-sm">
                <strong className="text-slate-900">
                  {formatCurrency(q.indicativeTotal, q.country)}
                </strong>
                {q.distanceKm != null && (
                  <span className="text-xs text-slate-500 ml-1.5">· {Math.round(q.distanceKm)} km</span>
                )}
              </span>
              <div className="flex items-center gap-1.5">
                <ShareQuoteButton quote={q} />
                <button
                  onClick={() => onResume(q)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-xs font-bold transition-base ease-marketplace"
                >
                  Resume →
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * <ShareQuoteButton> — copy-link button on each saved quote.
 *
 * Encodes the quote into a URL-safe token (saved-quotes-store
 * encoders), copies "https://flyttgo.us/?q=<token>" to the
 * clipboard, and flashes a 2s "Copied" tick. Recipients land on
 * the home page; AppLayout's inbound handler decodes the param
 * and saves it to their local store.
 *
 * Uses navigator.share where available so mobile customers get the
 * native share sheet; falls back to clipboard write on desktop.
 * ───────────────────────────────────────────────────────────────── */
function ShareQuoteButton({ quote }: { quote: SavedQuote }) {
  async function share() {
    const url = buildShareUrl(quote);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'FlyttGo move quote',
          text: `${quote.country.toUpperCase()}: ${quote.pickupAddress.split(',')[0]} → ${quote.dropoffAddress.split(',')[0]}`,
          url,
        });
        toast.success('Shared');
        return;
      } catch { /* user cancelled — fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied', {
        description: 'Forward it to anyone — they\'ll land on the country shopfront with your brief pre-loaded.',
      });
    } catch {
      window.prompt('Copy this share link:', url);
    }
  }

  return (
    <button
      onClick={share}
      aria-label="Share this quote"
      title="Share with a partner"
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-base ease-marketplace"
    >
      <Share2 size={12} />
      Share
    </button>
  );
}

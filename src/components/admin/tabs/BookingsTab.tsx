import React from 'react';
import { toast } from 'sonner';
import { downloadCsv, safeNumber } from '../utils';
import {
  useAutoDispatch,
  useReclaimStaleDispatches,
  useReleaseBookingPayment,
  useRefundBookingPayment,
} from '../../../hooks/queries/useAdminDashboard';
import type { BookingRow } from '../../../services/admin';
import type { AdminPanelHandlers } from '../types';

const RECLAIM_REASONS: Record<string, string> = {
  no_candidates:         'No eligible drivers found within 15 km. Use manual Dispatch to override.',
  booking_not_found:     'Booking no longer exists.',
  already_assigned:      'This booking already has a driver.',
  race_already_assigned: 'Another dispatch beat us to it — refresh to see the result.',
};

export function BookingsTab({
  bookings,
  handlers,
}: {
  bookings: BookingRow[];
  handlers: AdminPanelHandlers;
}) {
  const autoDispatch    = useAutoDispatch();
  const reclaimStale    = useReclaimStaleDispatches();
  const releasePayment  = useReleaseBookingPayment();
  const refundPayment   = useRefundBookingPayment();

  function exportCsv() {
    const rows = bookings.map(b => ({
      id:               b.id,
      created_at:       b.created_at,
      customer_id:      b.customer_id,
      driver_id:        b.driver_id,
      pickup_address:   b.pickup_address,
      dropoff_address:  b.dropoff_address,
      van_type:         b.van_type,
      status:           b.status,
      payment_status:   b.payment_status,
      price_estimate:   b.price_estimate,
      final_price:      b.final_price,
      estimated_hours:  b.estimated_hours,
      distance_km:      b.distance_km,
    }));
    downloadCsv(`flyttgo-bookings-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function runAutoDispatch(bookingId: string) {
    if (!confirm('Run auto-dispatch on this booking? The engine will pick the best-scoring available driver and assign them immediately.')) return;
    autoDispatch.mutate(bookingId, {
      onSuccess: result => {
        if (result.success) {
          alert(
            `Assigned to ${result.driver_name ?? result.driver_id}\n` +
            `Score: ${Number(result.score ?? 0).toFixed(1)}\n` +
            `Distance: ${Number(result.distance_km ?? 0).toFixed(1)} km\n` +
            `Same city: ${result.same_city ? 'yes' : 'no'}`,
          );
        } else {
          alert('Dispatch not completed: ' + (RECLAIM_REASONS[result.reason ?? ''] ?? result.reason ?? 'unknown'));
        }
      },
      onError: err => alert('Auto-dispatch failed: ' + (err instanceof Error ? err.message : 'unknown')),
    });
  }

  function runReclaim() {
    if (!confirm('Reclaim stale dispatches? Any booking that was assigned to a driver but never started (idle > 5 min) will revert to pending so another driver can take it.')) return;
    reclaimStale.mutate(undefined, {
      onSuccess: n => {
        alert(n === 0
          ? 'No stale dispatches found. Marketplace is clean.'
          : `Reclaimed ${n} stale booking${n === 1 ? '' : 's'} back to the pending pool.`);
      },
      onError: err => alert('Reclaim failed: ' + (err instanceof Error ? err.message : 'unknown')),
    });
  }

  function runRelease(b: BookingRow) {
    releasePayment.mutate(b, {
      onSuccess: () => toast.success('Driver wallet credited'),
      onError:   e => toast.error('Release failed', { description: e instanceof Error ? e.message : '' }),
    });
  }

  function runRefund(b: BookingRow) {
    refundPayment.mutate(b, {
      onSuccess: () => toast.success('Refund processed safely'),
      onError:   e => toast.error('Refund failed', { description: e instanceof Error ? e.message : '' }),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold">Bookings ({bookings.length})</h1>
        <div className="flex gap-2">
          <button
            onClick={runReclaim}
            disabled={reclaimStale.isPending}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded text-xs font-semibold"
            title="Revert any driver_assigned booking that has been idle > 5 min back to pending"
          >
            {reclaimStale.isPending ? 'Reclaiming…' : 'Reclaim Stale'}
          </button>
          <button
            onClick={exportCsv}
            className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded text-xs font-semibold"
          >
            Export CSV
          </button>
        </div>
      </div>
      <table className="w-full bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Route</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Price</th>
            <th className="p-3 text-left">Payment</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(b => (
            <tr
              key={b.id}
              className={`border-t relative ${
                b.payment_status === 'released' ? 'bg-green-50'
                : b.payment_status === 'refunded' ? 'bg-red-50'
                : b.payment_status === 'escrow' ? 'bg-yellow-50' : ''
              }`}
            >
              <td className="p-3">{b.pickup_address} → {b.dropoff_address}</td>
              <td className="p-3">{b.status}</td>
              <td className="p-3">{safeNumber(b.price_estimate).toFixed(0)} USD</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  b.payment_status === 'released' ? 'bg-green-100 text-green-700'
                  : b.payment_status === 'escrow' ? 'bg-yellow-100 text-yellow-700'
                  : b.payment_status === 'refunded' ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600'
                }`}>
                  {b.payment_status || 'pending'}
                </span>
              </td>
              <td className="p-3 flex gap-2 flex-wrap">
                {!b.driver_id && b.status !== 'cancelled' && b.status !== 'completed' && (
                  <>
                    <button
                      onClick={() => runAutoDispatch(b.id)}
                      disabled={autoDispatch.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-2 py-1 text-xs rounded"
                      title="Use the scoring engine to pick the best available driver automatically"
                    >
                      Auto Dispatch
                    </button>
                    <button
                      onClick={() => handlers.openManualDispatch(b)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 text-xs rounded"
                      title="Pick a specific driver to force-assign this booking"
                    >
                      Manual
                    </button>
                  </>
                )}
                <button
                  disabled={b.payment_status === 'released' || releasePayment.isPending}
                  onClick={() => runRelease(b)}
                  className={`px-2 py-1 text-xs rounded text-white ${
                    b.payment_status === 'released'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {b.payment_status === 'released' ? 'Released ✅' : 'Release'}
                </button>
                <button
                  onClick={() => runRefund(b)}
                  disabled={refundPayment.isPending}
                  className="bg-red-600 disabled:opacity-50 text-white px-2 py-1 text-xs rounded"
                >
                  Refund
                </button>
                <button
                  onClick={() => handlers.openManualRefund(b)}
                  className="bg-blue-600 text-white px-2 py-1 text-xs rounded"
                >
                  Dispute
                </button>
                <button
                  onClick={() => handlers.openTimeline(b.id)}
                  className="bg-gray-700 text-white px-2 py-1 text-xs rounded"
                >
                  Timeline
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

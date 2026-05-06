import { useState } from 'react';
import { safeNumber } from '../utils';
import { useManualDispatch } from '../../../hooks/queries/useAdminDashboard';
import type { BookingRow, DriverRow } from '../../../services/admin';

export function ManualDispatchModal({
  booking,
  drivers,
  onClose,
}: {
  booking: BookingRow;
  drivers: DriverRow[];
  onClose: () => void;
}) {
  const [driverId, setDriverId] = useState('');
  const dispatch = useManualDispatch();

  const eligible = drivers
    .filter(d => d.status === 'approved')
    .sort((a, b) => {
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;
      return (a.full_name ?? '').localeCompare(b.full_name ?? '');
    });

  function submit() {
    if (!driverId) return;
    dispatch.mutate(
      { bookingId: booking.id, driverId },
      {
        onSuccess: () => {
          alert('Booking dispatched to driver.');
          onClose();
        },
        onError: err => alert('Dispatch failed: ' + (err instanceof Error ? err.message : 'unknown')),
      },
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Manual dispatch"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-gray-900 text-lg mb-1">Manual Dispatch</h3>
        <p className="text-xs text-gray-500 mb-4">
          Force-assign this booking to a driver. Bypasses the normal dispatch flow — use when a booking has been waiting too long or you need to move a job to a specific driver.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs">
          <div className="font-semibold text-gray-800 mb-1 truncate">
            {booking.pickup_address} → {booking.dropoff_address}
          </div>
          <div className="text-gray-500">
            {safeNumber(booking.price_estimate).toFixed(0)} USD · {booking.van_type ?? 'any van'}
          </div>
        </div>
        <label htmlFor="dispatch-driver" className="block text-sm font-medium text-gray-700 mb-1">Select driver</label>
        <select
          id="dispatch-driver"
          value={driverId}
          onChange={e => setDriverId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-4 focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          <option value="">— pick a driver —</option>
          {eligible.map(d => (
            <option key={d.id} value={d.id}>
              {d.full_name || (d.id as string).slice(0, 8)} {d.online ? '🟢' : '⚫'}
              {d.driver_subscriptions?.[0]?.plan ? ` · ${d.driver_subscriptions[0].plan}` : ''}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={!driverId || dispatch.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-semibold"
          >
            {dispatch.isPending ? 'Dispatching…' : 'Dispatch now'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

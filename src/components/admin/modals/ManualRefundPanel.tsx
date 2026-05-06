import { useState } from 'react';
import { safeNumber } from '../utils';
import { useApplyManualRefund } from '../../../hooks/queries/useAdminDashboard';
import type { BookingRow } from '../../../services/admin';

export function ManualRefundPanel({
  booking,
  onClose,
}: {
  booking: BookingRow;
  onClose: () => void;
}) {
  const [percent, setPercent] = useState(0);
  const apply = useApplyManualRefund();
  const price = safeNumber(booking.price_estimate);

  function submit() {
    apply.mutate(
      { bookingId: booking.id, percent },
      {
        onSuccess: () => {
          alert('Manual refund override applied');
          onClose();
        },
        onError: err => alert('Apply failed: ' + (err instanceof Error ? err.message : 'unknown')),
      },
    );
  }

  return (
    <div className="fixed bottom-6 right-6 bg-white shadow-2xl rounded-lg p-6 z-50 w-80">
      <h3 className="font-bold text-gray-800 mb-1">Manual Refund Override</h3>
      <p className="text-xs text-gray-500 mb-3">
        Booking: {booking.pickup_address} → {booking.dropoff_address}
      </p>
      <p className="text-xs text-gray-500 mb-3">Price: {price.toFixed(0)} USD</p>
      <label htmlFor="refund-pct" className="block text-sm font-medium mb-1">Refund %</label>
      <input
        id="refund-pct"
        type="number"
        min={0}
        max={100}
        value={percent}
        onChange={e => setPercent(Number(e.target.value))}
        className="border rounded w-full px-3 py-2 mb-3"
      />
      <p className="text-sm text-gray-600 mb-3">
        Refund amount: <strong>{(price * (percent / 100)).toFixed(0)} USD</strong>
      </p>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={apply.isPending}
          className="flex-1 bg-emerald-600 disabled:opacity-50 text-white px-3 py-2 rounded text-sm"
        >
          Apply
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

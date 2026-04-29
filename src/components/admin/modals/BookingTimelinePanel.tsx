import { useBookingTimeline } from '../../../hooks/queries/useAdminDashboard';

export function BookingTimelinePanel({
  bookingId,
  onClose,
}: {
  bookingId: string;
  onClose: () => void;
}) {
  const { data: events = [], isLoading } = useBookingTimeline(bookingId);

  return (
    <div className="fixed bottom-6 left-6 bg-white shadow-2xl rounded-lg p-6 z-50 w-96">
      <h3 className="font-bold text-gray-800 mb-3">🎬 Booking Timeline Replay</h3>
      <div className="max-h-80 overflow-y-auto text-sm">
        {isLoading && <div className="text-xs text-gray-500">Loading…</div>}
        {!isLoading && events.length === 0 && (
          <div className="text-xs text-gray-500">No events recorded for this booking yet.</div>
        )}
        {events.map((e, i) => (
          <div key={i} className="border-b py-2">
            <div className="text-gray-400 text-xs">{new Date(e.time).toLocaleString()}</div>
            <div className="text-gray-800">{e.message}</div>
          </div>
        ))}
      </div>
      <button onClick={onClose} className="mt-3 w-full bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm">
        Close
      </button>
    </div>
  );
}

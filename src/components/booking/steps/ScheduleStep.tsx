import { useTranslation } from 'react-i18next';

const TIME_SLOTS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];

export function ScheduleStep({
  moveDate, setMoveDate,
  moveTime, setMoveTime,
  estimatedHours, setEstimatedHours,
  setError,
}: {
  moveDate: string;
  setMoveDate: (v: string) => void;
  moveTime: string;
  setMoveTime: (v: string) => void;
  estimatedHours: number;
  setEstimatedHours: (fn: (h: number) => number) => void;
  setError: (e: string) => void;
}) {
  const { t } = useTranslation();
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">{t('booking.scheduleTitle')}</h2>
      <p className="text-gray-500 text-sm mb-6">{t('booking.scheduleSubtitle')}</p>
      <div className="space-y-4">
        <div>
          <label htmlFor="move-date" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('booking.dateLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            id="move-date"
            type="date"
            value={moveDate}
            min={minDate}
            onChange={e => { setMoveDate(e.target.value); setError(''); }}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2E59]/20 outline-none"
          />
        </div>
        <div>
          <label htmlFor="move-time" className="block text-sm font-medium text-gray-700 mb-1.5">{t('booking.timeLabel')}</label>
          <select
            id="move-time"
            value={moveTime}
            onChange={e => setMoveTime(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2E59]/20 outline-none bg-white"
          >
            {TIME_SLOTS.map(slot => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('booking.durationLabel')}</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setEstimatedHours(h => Math.max(2, h - 0.5))}
              aria-label="Decrease estimated hours"
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              −
            </button>
            <span className="text-xl font-bold text-gray-800 w-12 text-center" aria-live="polite">{estimatedHours}h</span>
            <button
              type="button"
              onClick={() => setEstimatedHours(h => Math.min(12, h + 0.5))}
              aria-label="Increase estimated hours"
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              +
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('booking.durationHint')}</p>
        </div>
      </div>
    </div>
  );
}

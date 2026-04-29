import React from 'react';
import { useTranslation } from 'react-i18next';
import { VAN_TYPES } from '../../../lib/constants';

const MOVE_TYPES = [
  { id: 'apartment', label: 'Apartment',    icon: '🏢' },
  { id: 'house',     label: 'House',        icon: '🏠' },
  { id: 'office',    label: 'Office',       icon: '💼' },
  { id: 'student',   label: 'Student Move', icon: '🎓' },
  { id: 'furniture', label: 'Furniture',    icon: '🛋️' },
  { id: 'delivery',  label: 'Delivery',     icon: '📦' },
];

export function MoveDetailsStep({
  moveType, setMoveType,
  vanType, setVanType,
  helpers, setHelpers,
  setError,
}: {
  moveType: string;
  setMoveType: (v: string) => void;
  vanType: string;
  setVanType: (v: string) => void;
  helpers: number;
  setHelpers: (fn: (h: number) => number) => void;
  setError: (e: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">{t('booking.moveTitle')}</h2>
      <p className="text-gray-500 text-sm mb-6">{t('booking.moveSubtitle')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {MOVE_TYPES.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => { setMoveType(item.id); setError(''); }}
            className={`p-4 rounded-xl border-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${
              moveType === item.id
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            aria-pressed={moveType === item.id}
          >
            <div className="text-3xl mb-2" aria-hidden="true">{item.icon}</div>
            <div className="text-sm font-medium text-gray-800">{item.label}</div>
          </button>
        ))}
      </div>

      {moveType && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('booking.vanSizeLabel')}</label>
          <div className="grid grid-cols-2 gap-3">
            {VAN_TYPES.map(van => (
              <button
                key={van.id}
                type="button"
                onClick={() => setVanType(van.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${
                  vanType === van.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-pressed={vanType === van.id}
              >
                <div className="font-semibold text-sm text-gray-900">{van.name}</div>
                <div className="text-xs text-gray-500 mt-1">{van.capacity} · {van.payload}</div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">{van.pricePerHour} /hr USD</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('booking.helpersLabel')}</label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setHelpers(h => Math.max(0, h - 1))}
            aria-label="Decrease helpers"
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            −
          </button>
          <span className="text-xl font-bold text-gray-800 w-8 text-center" aria-live="polite">{helpers}</span>
          <button
            type="button"
            onClick={() => setHelpers(h => Math.min(3, h + 1))}
            aria-label="Increase helpers"
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            +
          </button>
          <span className="text-sm text-gray-500">{t('booking.helpersPerHour')}</span>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { INVENTORY_ITEMS, PROPERTY_PRESETS, VAN_TYPES, recommendVan } from '../../../lib/constants';

export function InventoryStep({
  inventory,
  setInventory,
  setVanType,
}: {
  inventory: Record<string, number>;
  setInventory: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  setVanType: (v: string) => void;
}) {
  const { t } = useTranslation();

  const totalVolume = useMemo(() => {
    return Object.entries(inventory).reduce((sum, [name, qty]) => {
      const item = Object.values(INVENTORY_ITEMS).flat().find(i => i.name === name);
      return sum + (item?.volume || 0) * qty;
    }, 0);
  }, [inventory]);

  function applyPreset(presetName: string) {
    const preset = PROPERTY_PRESETS[presetName];
    if (preset) setInventory(() => preset);
  }

  function updateInventory(itemName: string, delta: number) {
    setInventory(prev => {
      const current = prev[itemName] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [itemName]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemName]: next };
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">{t('booking.inventoryTitle')}</h2>
      <p className="text-gray-500 text-sm mb-6">{t('booking.inventorySubtitle')}</p>

      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">{t('booking.inventoryPreset')}</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PROPERTY_PRESETS).map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {totalVolume > 0 && (
        <div className="mb-6 bg-emerald-50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-emerald-800 font-semibold text-sm">Total Volume: {totalVolume.toFixed(1)} m³</p>
            <p className="text-emerald-600 text-xs mt-0.5">
              Recommended: {VAN_TYPES.find(v => v.id === recommendVan(totalVolume))?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVanType(recommendVan(totalVolume))}
            className="px-3 py-2 bg-emerald-600 text-white text-xs rounded-lg font-semibold hover:bg-emerald-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          >
            Use Recommended
          </button>
        </div>
      )}

      {Object.entries(INVENTORY_ITEMS).map(([category, items]) => (
        <div key={category} className="mb-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-3 border-b pb-2">{category}</h3>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.name} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{item.volume}m³ · {item.weight}kg</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateInventory(item.name, -1)}
                    aria-label={`Remove one ${item.name}`}
                    className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium text-gray-800">
                    {inventory[item.name] || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateInventory(item.name, 1)}
                    aria-label={`Add one ${item.name}`}
                    className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

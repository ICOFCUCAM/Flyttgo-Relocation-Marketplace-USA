import React, { useState } from 'react';

const RATES: Record<string, number> = { free: 0, basic: 0.2, pro_mini: 0.1, pro: 0.1, unlimited: 0 };

export function EarningsCalculator({ plan }: { plan: string }) {
  const [jobPrice, setJobPrice] = useState(1000);
  const [hours,    setHours]    = useState(2);
  const rate       = RATES[plan] ?? 0.2;
  const commission = jobPrice * rate;
  const earning    = jobPrice - commission;
  const hourlyRate = hours > 0 ? earning / hours : 0;

  return (
    <div className="bg-gray-50 rounded-xl p-5">
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label htmlFor="ec-job" className="block text-xs font-medium text-gray-600 mb-1">Job Price (USD)</label>
          <input
            id="ec-job"
            type="range"
            min={300}
            max={10000}
            step={100}
            value={jobPrice}
            onChange={e => setJobPrice(Number(e.target.value))}
            className="w-full accent-emerald-600"
          />
          <div className="text-right text-sm font-semibold text-emerald-600 mt-1">
            {jobPrice.toLocaleString()} USD
          </div>
        </div>
        <div>
          <label htmlFor="ec-hours" className="block text-xs font-medium text-gray-600 mb-1">Estimated Hours</label>
          <input
            id="ec-hours"
            type="range"
            min={1}
            max={12}
            step={0.5}
            value={hours}
            onChange={e => setHours(Number(e.target.value))}
            className="w-full accent-emerald-600"
          />
          <div className="text-right text-sm font-semibold text-gray-700 mt-1">{hours}h</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-3 text-center border">
          <div className="text-xs text-gray-500 mb-1">Commission ({(rate * 100).toFixed(0)}%)</div>
          <div className="text-lg font-bold text-red-500">-{commission.toFixed(0)} USD</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border">
          <div className="text-xs text-gray-500 mb-1">You Earn</div>
          <div className="text-lg font-bold text-emerald-600">{earning.toFixed(0)} USD</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border">
          <div className="text-xs text-gray-500 mb-1">Per Hour</div>
          <div className="text-lg font-bold text-gray-900">{hourlyRate.toFixed(0)} USD</div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

const SCHEDULES = [
  { name: 'Los Angeles Weekly Supply', freq: 'Every Monday 07:00',  route: 'New York → Los Angeles',                 status: 'Active', nextRun: 'Mon 07:00' },
  { name: 'Daily Houston Run',         freq: 'Daily 06:30',          route: 'New York Central → Houston Depot',      status: 'Active', nextRun: 'Tomorrow 06:30' },
  { name: 'Monthly Archive Pickup',    freq: '1st of month 14:00',   route: 'Multiple → New York Warehouse',          status: 'Paused', nextRun: '1 May 14:00' },
];

export function RecurringTab() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-500 text-sm">3 active schedules · Next run: Today 16:00</p>
        <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">
          + New Schedule
        </button>
      </div>
      {SCHEDULES.map(s => (
        <div key={s.name} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <div className="font-bold text-gray-900">{s.name}</div>
            <div className="text-sm text-gray-500 mt-1">{s.route} · {s.freq}</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <div className="text-gray-400 text-xs">Next run</div>
              <div className="font-medium text-gray-700">{s.nextRun}</div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {s.status}
            </span>
            <button className="text-emerald-600 text-xs hover:underline">Edit</button>
          </div>
        </div>
      ))}
    </div>
  );
}

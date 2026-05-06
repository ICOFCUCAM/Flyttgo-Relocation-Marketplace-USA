import { StatCard } from '../StatCard';

const ACTIVITY_FEED = [
  { time: '13:42', msg: '🚚 SHP-10482 departed New York Warehouse — ETA Los Angeles 14:30', color: 'text-blue-600' },
  { time: '13:15', msg: '✅ SHP-10481 delivered to Ålesund Office · Confirmed by Erik A.',     color: 'text-emerald-600' },
  { time: '12:58', msg: '⚠️ SHP-10478 delayed — traffic incident on E6 · Driver notified',     color: 'text-red-600' },
  { time: '12:30', msg: '📋 Recurring schedule "Los Angeles Weekly" executed — 3 orders created', color: 'text-gray-600' },
  { time: '11:45', msg: '💳 Invoice INV-2026-04 generated · 47 deliveries · 89,200 USD',        color: 'text-gray-600' },
];

const CITY_PERFORMANCE = [
  { city: 'New York',     jobs: 156, util: 82, spend: '64,200' },
  { city: 'Los Angeles',  jobs: 89,  util: 71, spend: '38,100' },
  { city: 'Chicago',      jobs: 54,  util: 68, spend: '22,800' },
  { city: 'Houston',      jobs: 43,  util: 75, spend: '17,300' },
];

export function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="🚚" label="Active Shipments"    value="24"          sub="↑ 3 from yesterday"           color="blue" />
        <StatCard icon="📅" label="Scheduled Today"      value="47"          sub="Next: 09:30 New York Hub"     color="emerald" />
        <StatCard icon="🏎️" label="Fleet Utilization"   value="78%"         sub="19 of 24 drivers active"      color="purple" />
        <StatCard icon="💰" label="Monthly Spend"        value="142,400 USD" sub="↓ 8% vs last month"           color="orange" />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon="🌱" label="Carbon Footprint"     value="2.4 tCO₂"    sub="This month · -12% YoY"        color="emerald" />
        <StatCard icon="⭐" label="Avg Driver Rating"    value="4.8 / 5"     sub="Based on 312 deliveries"      color="blue" />
        <StatCard icon="✅" label="On-Time Delivery"      value="96.2%"       sub="Target: 95%"                  color="purple" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-4">Live Activity Feed</h3>
        <div className="space-y-3">
          {ACTIVITY_FEED.map((item, i) => (
            <div key={i} className="flex gap-3 items-start text-sm border-b border-gray-50 pb-3 last:border-0">
              <span className="text-xs text-gray-400 font-mono w-12 flex-shrink-0 pt-0.5">{item.time}</span>
              <span className={item.color}>{item.msg}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-4">City Performance</h3>
        <div className="space-y-3">
          {CITY_PERFORMANCE.map(r => (
            <div key={r.city} className="flex items-center gap-4 text-sm">
              <span className="w-24 font-medium text-gray-700">{r.city}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${r.util}%` }} />
              </div>
              <span className="text-gray-500 w-8">{r.util}%</span>
              <span className="text-gray-700 font-medium w-28 text-right">{r.spend} USD</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

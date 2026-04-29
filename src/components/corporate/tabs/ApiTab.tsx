import React from 'react';
import { StatCard } from '../StatCard';

const CREDENTIALS = [
  { label: 'API Key',         value: 'fgo_live_••••••••••••••••4f2a',  copy: true  },
  { label: 'Webhook Secret',  value: 'whsec_••••••••••••••••9b1c',     copy: true  },
  { label: 'Base URL',        value: 'https://api.flyttgo.com/v1',     copy: false },
  { label: 'Environment',     value: 'Production',                     copy: false },
];

const WEBHOOKS = [
  { url: 'https://erp.acme.no/webhooks/flyttgo', events: 'delivery.completed, delivery.failed', status: 'Active' },
  { url: 'https://wms.acme.no/hooks/inbound',    events: 'booking.created, booking.cancelled',  status: 'Active' },
];

export function ApiTab() {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon="⚡" label="API Calls Today"  value="12,482" sub="↑ 8% vs yesterday"   color="blue" />
        <StatCard icon="✅" label="Success Rate"      value="99.8%"  sub="Last 30 days"        color="emerald" />
        <StatCard icon="🔔" label="Webhooks Fired"    value="1,247"  sub="24 failed (retrying)" color="purple" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-4">API Credentials</h3>
        <div className="space-y-3">
          {CREDENTIALS.map(item => (
            <div key={item.label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <div className="text-xs text-gray-400 font-medium">{item.label}</div>
                <div className="font-mono text-sm text-gray-700 mt-0.5">{item.value}</div>
              </div>
              {item.copy && (
                <button className="text-xs text-emerald-600 border border-emerald-200 px-3 py-1 rounded-lg hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                  Copy
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-4">Webhook Endpoints</h3>
        {WEBHOOKS.map((wh, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div>
              <div className="font-mono text-xs text-gray-700">{wh.url}</div>
              <div className="text-xs text-gray-400 mt-0.5">{wh.events}</div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
              {wh.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

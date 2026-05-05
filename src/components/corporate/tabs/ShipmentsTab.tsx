import { useMemo, useState } from 'react';
import { FOCUS_RING } from '../../ds';
import { SHIPMENTS, STATUS_COLORS } from '../types';

export function ShipmentsTab() {
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SHIPMENTS.filter(s => {
      const matchSearch = s.id.toLowerCase().includes(q)
        || s.from.toLowerCase().includes(q)
        || s.to.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || s.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [search, filterStatus]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          aria-label="Search shipments"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search shipment ID, origin, or destination..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
        />
        <select
          aria-label="Filter by status"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
        >
          <option value="all">All Status</option>
          <option>In Transit</option>
          <option>Delivered</option>
          <option>Scheduled</option>
          <option>Exception</option>
        </select>
        <button className={`px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition ${FOCUS_RING}`}>
          + New Shipment
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Shipment ID', 'From', 'To', 'Status', 'Driver', 'ETA', 'Value', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition">
                <td className="py-3.5 px-4 font-mono text-xs text-gray-600">{s.id}</td>
                <td className="py-3.5 px-4 text-gray-700">{s.from}</td>
                <td className="py-3.5 px-4 text-gray-700">{s.to}</td>
                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-gray-600">{s.driver}</td>
                <td className="py-3.5 px-4 text-gray-600">{s.eta}</td>
                <td className="py-3.5 px-4 font-medium text-gray-900">{s.value}</td>
                <td className="py-3.5 px-4">
                  <button className="text-xs text-emerald-600 hover:underline">Track →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">No shipments match your search.</div>
        )}
      </div>
    </div>
  );
}

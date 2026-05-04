import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { downloadCsv } from '../utils';
import {
  useUpdateDriverStatus,
  useAssignDriverPlan,
} from '../../../hooks/queries/useAdminDashboard';
import type { DriverRow } from '../../../services/admin';
import type { AdminPanelHandlers } from '../types';

type StatusFilter = 'all' | 'approved' | 'pending' | 'suspended';
type OnlineFilter = 'all' | 'online' | 'offline';

export function DriversTab({
  drivers,
  driverSubExpiry,
  handlers,
}: {
  drivers: DriverRow[];
  driverSubExpiry: Record<string, string | null>;
  handlers: AdminPanelHandlers;
}) {
  const updateStatus = useUpdateDriverStatus();
  const assignPlan   = useAssignDriverPlan();

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [onlineFilter, setOnlineFilter] = useState<OnlineFilter>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter(d => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (onlineFilter === 'online'  && d.online !== true) return false;
      if (onlineFilter === 'offline' && d.online === true) return false;
      if (q) {
        const hay = `${d.full_name ?? ''} ${d.phone ?? ''} ${d.user_id ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [drivers, search, statusFilter, onlineFilter]);

  function exportCsv() {
    const rows = filtered.map(d => ({
      id:                d.id,
      user_id:           d.user_id,
      full_name:         d.full_name,
      phone:             d.phone,
      status:            d.status,
      online:            d.online,
      subscription_plan: d.driver_subscriptions?.[0]?.plan ?? null,
      expiry:            driverSubExpiry[d.user_id ?? d.id] ?? null,
    }));
    downloadCsv(`flyttgo-drivers-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  const filtersActive = search || statusFilter !== 'all' || onlineFilter !== 'all';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Drivers ({filtered.length})</h1>
        <button
          onClick={exportCsv}
          className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="driver-search" className="block text-xs font-medium text-gray-600 mb-1">Search</label>
          <input
            id="driver-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name, phone, or id"
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div>
          <label htmlFor="driver-status" className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            id="driver-status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="border border-gray-200 rounded px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div>
          <label htmlFor="driver-online" className="block text-xs font-medium text-gray-600 mb-1">Online</label>
          <select
            id="driver-online"
            value={onlineFilter}
            onChange={e => setOnlineFilter(e.target.value as OnlineFilter)}
            className="border border-gray-200 rounded px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>
        {filtersActive && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); setOnlineFilter('all'); }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <table className="w-full bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Online</th>
            <th className="p-3 text-left">Plan / Expiry</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(d => {
            const endDate = driverSubExpiry[d.user_id ?? d.id] ?? null;
            const daysLeft = endDate
              ? Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000)
              : null;
            return (
              <tr key={d.id} className="border-t">
                <td className="p-3">{d.full_name || d.id}</td>
                <td className="p-3">{d.status}</td>
                <td className="p-3">{d.online ? '🟢 Yes' : '⚫ No'}</td>
                <td className="p-3">
                  <div>{d.driver_subscriptions?.[0]?.plan || '—'}</div>
                  {daysLeft !== null && (
                    <div
                      className={`text-xs mt-0.5 ${
                        daysLeft <= 3
                          ? 'text-red-500 font-semibold'
                          : daysLeft <= 7
                            ? 'text-orange-500'
                            : 'text-gray-400'
                      }`}
                    >
                      {daysLeft > 0 ? `Expires in ${daysLeft}d` : '⚠️ Expired'}
                    </div>
                  )}
                </td>
                <td className="p-3 flex gap-2 flex-wrap">
                  <button
                    onClick={() => handlers.openDriverDocs(d)}
                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-xs font-bold rounded transition"
                    title="View driver documents"
                  >
                    <FileText size={11} />
                    Docs
                  </button>
                  <button
                    onClick={() => updateStatus.mutate({ id: d.id, status: 'approved' })}
                    className="bg-emerald-600 text-white px-2 py-1 text-xs rounded"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus.mutate({ id: d.id, status: 'suspended' })}
                    className="bg-red-600 text-white px-2 py-1 text-xs rounded"
                  >
                    Suspend
                  </button>
                  <button
                    onClick={() => assignPlan.mutate({ driverId: d.id, plan: 'premium' })}
                    className="bg-blue-600 text-white px-2 py-1 text-xs rounded"
                  >
                    Assign Premium
                  </button>
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-sm text-gray-500">
                No drivers match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

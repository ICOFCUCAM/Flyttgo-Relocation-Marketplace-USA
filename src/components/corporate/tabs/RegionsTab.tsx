import React from 'react';
import { OrgPicker } from '../OrgPicker';
import { useOrgRelocationRequests } from '../../../hooks/queries/useCorporateDashboard';
import type { OrganizationRow } from '../../../lib/organizations-store';

interface CountryStats {
  active:    number;
  scheduled: number;
  completed: number;
  cities:    Set<string>;
}

export function RegionsTab({
  orgs,
  activeOrgId,
  onSelectOrg,
}: {
  orgs: OrganizationRow[];
  activeOrgId: string | null;
  onSelectOrg: (id: string) => void;
}) {
  const { data: requests = [] } = useOrgRelocationRequests(activeOrgId);

  const grouped = new Map<string, CountryStats>();
  for (const r of requests) {
    const k = r.country.toUpperCase();
    const row = grouped.get(k) ?? { active: 0, scheduled: 0, completed: 0, cities: new Set<string>() };
    if (['submitted','approved','dispatched'].includes(r.status)) row.active += 1;
    if (r.status === 'approved' || r.status === 'dispatched')      row.scheduled += 1;
    if (r.status === 'completed')                                  row.completed += 1;
    if (r.city) row.cities.add(r.city);
    grouped.set(k, row);
  }
  const rows = Array.from(grouped.entries()).sort((a, b) => b[1].active - a[1].active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Deployment regions</h1>
        <OrgPicker orgs={orgs} activeOrgId={activeOrgId} onSelect={onSelectOrg} />
      </div>
      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-500">
          No relocations yet — once requests start dispatching the countries + cities you operate in will appear here.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Country', 'Active', 'Scheduled', 'Completed', 'Cities'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(([country, stats]) => (
                <tr key={country} className="hover:bg-gray-50">
                  <td className="py-3.5 px-4 font-bold uppercase">{country}</td>
                  <td className="py-3.5 px-4">{stats.active}</td>
                  <td className="py-3.5 px-4">{stats.scheduled}</td>
                  <td className="py-3.5 px-4">{stats.completed}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-500">
                    {stats.cities.size === 0
                      ? '—'
                      : Array.from(stats.cities).slice(0, 6).join(' · ')}
                    {stats.cities.size > 6 && (
                      <span className="text-gray-400"> +{stats.cities.size - 6}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

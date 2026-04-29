import React from 'react';
import { OrgPicker } from '../OrgPicker';
import { useOrgContracts } from '../../../hooks/queries/useCorporateDashboard';
import type { OrganizationRow } from '../../../lib/organizations-store';

export function ContractsTab({
  orgs,
  activeOrgId,
  onSelectOrg,
}: {
  orgs: OrganizationRow[];
  activeOrgId: string | null;
  onSelectOrg: (id: string) => void;
}) {
  const { data: contracts = [] } = useOrgContracts(activeOrgId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Contract history</h1>
        <OrgPicker orgs={orgs} activeOrgId={activeOrgId} onSelect={onSelectOrg} />
      </div>
      {contracts.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-500">
          No framework agreements on file yet. Contracts are admin-managed — reach out to partnerships@flyttgo.com to set up pre-negotiated discount % or hourly caps.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Pricing', 'Min provider tier', 'Validity'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contracts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-3.5 px-4 font-bold">{c.name}</td>
                  <td className="py-3.5 px-4 text-xs">
                    {c.discount_pct != null
                      ? `${Math.round(Number(c.discount_pct) * 100)}% off public rate`
                      : c.hourly_cap_usd != null
                        ? `$${c.hourly_cap_usd}/hr cap`
                        : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-xs uppercase tracking-wider">
                    {c.min_provider_tier
                      ? c.min_provider_tier === 'elite'
                        ? 'Certified Infrastructure Partner'
                        : c.min_provider_tier.replace('_', ' ')
                      : 'any'}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-500">
                    {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : '—'}
                    {' → '}
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'open'}
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

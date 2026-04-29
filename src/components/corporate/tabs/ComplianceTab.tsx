import React from 'react';
import { OrgPicker } from '../OrgPicker';
import {
  useOrgRelocationRequests,
} from '../../../hooks/queries/useCorporateDashboard';
import type {
  OrganizationRow, OrganizationMemberRow,
} from '../../../lib/organizations-store';

export function ComplianceTab({
  orgs,
  activeOrgId,
  onSelectOrg,
  memberships,
}: {
  orgs: OrganizationRow[];
  activeOrgId: string | null;
  onSelectOrg: (id: string) => void;
  memberships: OrganizationMemberRow[];
}) {
  const { data: requests = [] } = useOrgRelocationRequests(activeOrgId);
  const org = orgs.find(o => o.id === activeOrgId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Compliance status</h1>
        <OrgPicker orgs={orgs} activeOrgId={activeOrgId} onSelect={onSelectOrg} />
      </div>
      {!org ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-500">
          Pick an organization to see its compliance posture.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <OrgStatusCard org={org} />
          <YourAccessCard
            membership={memberships.find(m => m.organization_id === org.id)}
          />
          <ProviderComplianceCard
            dispatched={requests.filter(r => r.dispatched_booking_id != null).length}
          />
        </div>
      )}
    </div>
  );
}

function OrgStatusCard({ org }: { org: OrganizationRow }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
        Organization status
      </p>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center justify-between">
          <span>Procurement verified</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
            org.procurement_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {org.procurement_verified ? 'Verified' : 'Pending'}
          </span>
        </li>
        <li className="flex items-center justify-between">
          <span>Tax registration</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
            org.tax_registration ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {org.tax_registration ? 'On file' : 'Missing'}
          </span>
        </li>
        <li className="flex items-center justify-between">
          <span>Billing model</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
            {org.billing_model}
          </span>
        </li>
        <li className="flex items-center justify-between">
          <span>Country</span>
          <span className="text-[10px] font-mono text-gray-500">{org.country_code.toUpperCase()}</span>
        </li>
        <li className="flex items-center justify-between">
          <span>Sector</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
            {org.sector}
          </span>
        </li>
      </ul>
    </div>
  );
}

function YourAccessCard({ membership }: { membership: OrganizationMemberRow | undefined }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Your access</p>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center justify-between">
          <span>Role</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
            {membership?.role ?? 'unknown'}
          </span>
        </li>
        <li className="flex items-center justify-between">
          <span>Joined</span>
          <span className="text-[10px] text-gray-500">
            {membership?.joined_at ? new Date(membership.joined_at).toLocaleDateString() : '—'}
          </span>
        </li>
      </ul>
    </div>
  );
}

function ProviderComplianceCard({ dispatched }: { dispatched: number }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 sm:col-span-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
        Provider compliance · linked to your bookings
      </p>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center justify-between">
          <span>Dispatched bookings</span>
          <span className="font-mono text-gray-700">{dispatched}</span>
        </li>
        <li className="flex items-center justify-between">
          <span>Routing posture</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
            CIP first · Gold Pro · Gold
          </span>
        </li>
        <li className="text-xs text-gray-500 leading-relaxed pt-2 border-t border-gray-100">
          Every dispatched provider was filtered through{' '}
          <code className="font-mono bg-gray-100 px-1 rounded">find_eligible_providers_for_segment</code>{' '}
          and ranked by{' '}
          <code className="font-mono bg-gray-100 px-1 rounded">tier_position DESC, rank_score DESC</code>.
          Suspended providers are excluded automatically.
        </li>
      </ul>
    </div>
  );
}

import type { OrganizationRow } from '../../lib/organizations-store';

/** Small dropdown shown above any real-data tab when the user belongs
 *  to multiple organizations. Hidden when there's only one. */
export function OrgPicker({
  orgs,
  activeOrgId,
  onSelect,
}: {
  orgs: OrganizationRow[];
  activeOrgId: string | null;
  onSelect: (id: string) => void;
}) {
  if (orgs.length <= 1) return null;
  return (
    <select
      value={activeOrgId ?? ''}
      onChange={e => onSelect(e.target.value)}
      aria-label="Active organization"
      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
    >
      {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

import { toast } from 'sonner';
import { OrgPicker } from '../OrgPicker';
import {
  useOrgInvites,
  useCreateOrgInvite,
  useRevokeOrgInvite,
} from '../../../hooks/queries/useCorporateDashboard';
import type {
  OrganizationRow, OrganizationInviteRow, OrganizationRole,
} from '../../../lib/organizations-store';

const VALID_ROLES = ['owner', 'approver', 'requester', 'viewer'] as const;

export function MembersTab({
  orgs,
  activeOrgId,
  onSelectOrg,
}: {
  orgs: OrganizationRow[];
  activeOrgId: string | null;
  onSelectOrg: (id: string) => void;
}) {
  const { data: invites = [] } = useOrgInvites(activeOrgId);
  const createInvite = useCreateOrgInvite(activeOrgId);
  const revokeInvite = useRevokeOrgInvite(activeOrgId);

  const busy = createInvite.isPending || revokeInvite.isPending;

  function handleInvite() {
    if (!activeOrgId) return;
    const email = prompt('Email of the person to invite?') ?? '';
    if (!email.trim()) return;
    const role = (prompt('Role? (owner / approver / requester / viewer)') ?? '').trim();
    if (!VALID_ROLES.includes(role as OrganizationRole)) {
      toast.error('Invalid role');
      return;
    }
    createInvite.mutate({ email, role: role as OrganizationRole }, {
      onSuccess: async token => {
        const link = `${window.location.origin}/invite?token=${token}`;
        await navigator.clipboard.writeText(link).catch(() => {});
        toast.success('Invite created · link copied to clipboard', { description: link });
      },
      onError: e => toast.error('Invite failed', { description: e instanceof Error ? e.message : '' }),
    });
  }

  function handleRevoke(invite: OrganizationInviteRow) {
    revokeInvite.mutate(invite.id, {
      onSuccess: () => toast.success('Invite revoked'),
      onError:   e => toast.error('Revoke failed', { description: e instanceof Error ? e.message : '' }),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Members & invites</h1>
        <div className="flex items-center gap-3">
          <OrgPicker orgs={orgs} activeOrgId={activeOrgId} onSelect={onSelectOrg} />
          <button
            disabled={busy || !activeOrgId}
            onClick={handleInvite}
            className={`px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg ${FOCUS_RING}`}
          >
            Invite member
          </button>
        </div>
      </div>

      {orgs.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-500">
          Join an organization first.
        </div>
      ) : invites.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-500">
          No outstanding invites. The "Invite member" button copies a signed link you can share via your usual channel.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Expires</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map(i => {
                const expired = new Date(i.expires_at) < new Date();
                return (
                  <tr key={i.id} className="border-t">
                    <td className="p-3">{i.invited_email}</td>
                    <td className="p-3 text-xs uppercase tracking-wider">{i.role}</td>
                    <td className="p-3">
                      {i.accepted_at ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md">Accepted</span>
                      ) : i.revoked_at ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">Revoked</span>
                      ) : expired ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md">Expired</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">Pending</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {new Date(i.expires_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {!i.accepted_at && !i.revoked_at && (
                        <button
                          disabled={busy}
                          onClick={() => handleRevoke(i)}
                          className="text-[10px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

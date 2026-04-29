import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { OrgPicker } from '../OrgPicker';
import {
  useOrgRelocationRequests,
  useApproveRelocationRequest,
  useRejectRelocationRequest,
  useDispatchRelocationRequest,
} from '../../../hooks/queries/useCorporateDashboard';
import type { OrganizationRow, RelocationRequestRow } from '../../../lib/organizations-store';
import type { RelocationStatusFilter } from '../types';

export function RelocationsTab({
  orgs,
  activeOrgId,
  onSelectOrg,
  userId,
}: {
  orgs: OrganizationRow[];
  activeOrgId: string | null;
  onSelectOrg: (id: string) => void;
  userId: string | null | undefined;
}) {
  const { data: requests = [] } = useOrgRelocationRequests(activeOrgId);
  const approve  = useApproveRelocationRequest(activeOrgId);
  const reject   = useRejectRelocationRequest(activeOrgId);
  const dispatch = useDispatchRelocationRequest(activeOrgId);

  const [statusFilter, setStatusFilter] = useState<RelocationStatusFilter>('active');

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    if (statusFilter === 'active') {
      return requests.filter(r => ['submitted', 'approved', 'dispatched'].includes(r.status));
    }
    if (statusFilter === 'scheduled') {
      return requests.filter(r => r.status === 'approved' || r.status === 'dispatched');
    }
    return requests.filter(r => r.status === 'completed');
  }, [requests, statusFilter]);

  const busy = approve.isPending || reject.isPending || dispatch.isPending;

  function handleApprove(req: RelocationRequestRow) {
    if (!userId) return;
    approve.mutate({ req, userId }, {
      onSuccess: () => toast.success('Approved · auto-dispatching to provider'),
      onError:   e => toast.error('Approve failed', { description: e instanceof Error ? e.message : '' }),
    });
  }

  function handleReject(req: RelocationRequestRow) {
    if (!userId) return;
    const comment = prompt('Reason for rejecting?') ?? '';
    if (!comment.trim()) return;
    reject.mutate({ req, userId, comment }, {
      onSuccess: () => toast.success('Rejected'),
      onError:   e => toast.error('Reject failed', { description: e instanceof Error ? e.message : '' }),
    });
  }

  function handleDispatch(req: RelocationRequestRow) {
    dispatch.mutate(req, {
      onSuccess: bookingId => {
        if (bookingId) toast.success('Dispatched', { description: `Booking ${bookingId.slice(0, 8)}…` });
        else toast.warning('No eligible provider yet — admin will retry');
      },
      onError: e => toast.error('Dispatch failed', { description: e instanceof Error ? e.message : '' }),
    });
  }

  const counts = useMemo(() => ({
    active:    requests.filter(r => ['submitted','approved','dispatched'].includes(r.status)).length,
    scheduled: requests.filter(r => r.status === 'approved' || r.status === 'dispatched').length,
    completed: requests.filter(r => r.status === 'completed').length,
    all:       requests.length,
  }), [requests]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Relocation requests</h1>
        <OrgPicker orgs={orgs} activeOrgId={activeOrgId} onSelect={onSelectOrg} />
      </div>

      <div className="flex items-center gap-1.5 mb-4 flex-wrap" role="tablist" aria-label="Status">
        {([
          { id: 'active'    as const, label: 'Active',    count: counts.active },
          { id: 'scheduled' as const, label: 'Scheduled', count: counts.scheduled },
          { id: 'completed' as const, label: 'Completed', count: counts.completed },
          { id: 'all'       as const, label: 'All',       count: counts.all },
        ]).map(opt => (
          <button
            key={opt.id}
            onClick={() => setStatusFilter(opt.id)}
            aria-pressed={statusFilter === opt.id}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              statusFilter === opt.id
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {opt.label} <span className="opacity-60">({opt.count})</span>
          </button>
        ))}
      </div>

      {orgs.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-500">
          You're not yet a member of an organization. Reach out to partnerships@flyttgo.com to onboard your team.
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-500">
          No {statusFilter === 'all' ? '' : statusFilter + ' '}requests for {orgs.find(o => o.id === activeOrgId)?.name}.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="p-3 text-left">Filed</th>
                <th className="p-3 text-left">Segment · country</th>
                <th className="p-3 text-left">Brief</th>
                <th className="p-3 text-left">Provider</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(r => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <div className="font-bold capitalize">{r.segment}</div>
                    <div className="text-xs text-gray-500 uppercase">{r.country}{r.city ? ` · ${r.city}` : ''}</div>
                  </td>
                  <td className="p-3 text-xs text-gray-600 max-w-xs truncate">
                    {(r.brief?.summary as string) ?? (r.brief?.inventoryNote as string) ?? '—'}
                  </td>
                  <td className="p-3 text-xs">
                    {r.dispatched_booking_id ? (
                      <span className="font-mono text-emerald-700">{r.dispatched_booking_id.slice(0, 8)}…</span>
                    ) : <span className="text-gray-400">unassigned</span>}
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                      r.status === 'submitted'  ? 'bg-amber-100 text-amber-700' :
                      r.status === 'approved'   ? 'bg-blue-100 text-blue-700' :
                      r.status === 'dispatched' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'completed'  ? 'bg-gray-100 text-gray-600' :
                      r.status === 'rejected' || r.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                                                  'bg-slate-100 text-slate-500'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {r.status === 'submitted' ? (
                      <div className="flex gap-1.5">
                        <button disabled={busy} onClick={() => handleApprove(r)}
                          className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded disabled:opacity-50">
                          Approve
                        </button>
                        <button disabled={busy} onClick={() => handleReject(r)}
                          className="text-[10px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded disabled:opacity-50">
                          Reject
                        </button>
                      </div>
                    ) : r.status === 'approved' ? (
                      <button disabled={busy} onClick={() => handleDispatch(r)}
                        className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded disabled:opacity-50">
                        Re-dispatch
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
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

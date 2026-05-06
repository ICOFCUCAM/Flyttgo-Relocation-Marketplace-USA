import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listAudit } from '../services/audit-service';
import { RequirePermission } from '../rbac/Guard';
import { PERMISSIONS } from '../rbac/permissions';

export default function AuditLogPage() {
  const [actionPrefix, setActionPrefix] = useState('');
  const [targetType,   setTargetType]   = useState('');
  /* Date-range filter — defaults to "last 30 days". Empty string =
   * unbounded, so the operator can clear either end. */
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [dateTo,   setDateTo]   = useState('');

  const audit = useQuery({
    queryKey: ['bos', 'audit', { actionPrefix, targetType, dateFrom, dateTo }],
    queryFn:  () => listAudit({
      action:     actionPrefix || undefined,
      targetType: targetType   || undefined,
      from:       dateFrom     || undefined,
      to:         dateTo       || undefined,
      limit:      200,
    }),
  });

  function reset() {
    setActionPrefix(''); setTargetType(''); setDateFrom(''); setDateTo('');
  }

  return (
    <RequirePermission perm={PERMISSIONS.AUDIT_VIEW}>
      <div className="space-y-6">
        <header>
          <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-1">Audit log</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Operator audit trail</h1>
          <p className="text-slate-600 mt-1 text-sm">
            Append-only record of every state-changing back-office action. Insert is the only mutation policy granted by RLS — there is no UPDATE or DELETE on this table.
          </p>
        </header>

        <div className="flex items-end gap-3 flex-wrap">
          <label className="block text-sm">
            <span className="text-xs font-bold text-slate-600 block mb-1">Action prefix</span>
            <input value={actionPrefix} onChange={e => setActionPrefix(e.target.value)} placeholder="e.g. markets." className="border border-slate-200 rounded-md px-3 py-1.5 text-sm w-56" />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-bold text-slate-600 block mb-1">Target type</span>
            <input value={targetType} onChange={e => setTargetType(e.target.value)} placeholder="e.g. invoice" className="border border-slate-200 rounded-md px-3 py-1.5 text-sm w-56" />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-bold text-slate-600 block mb-1">From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-slate-200 rounded-md px-3 py-1.5 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-bold text-slate-600 block mb-1">To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-slate-200 rounded-md px-3 py-1.5 text-sm" />
          </label>
          <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-700 underline self-center mt-4">Reset</button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-5 py-3 font-bold">Time</th>
                <th className="text-left px-5 py-3 font-bold">Actor</th>
                <th className="text-left px-5 py-3 font-bold">Role</th>
                <th className="text-left px-5 py-3 font-bold">Action</th>
                <th className="text-left px-5 py-3 font-bold">Target</th>
                <th className="text-left px-5 py-3 font-bold">Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(audit.data ?? []).map(row => (
                <tr key={row.id}>
                  <td className="px-5 py-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(row.occurred_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-2 font-mono text-[11px] text-slate-700">{row.actor_id?.slice(0, 8) ?? '—'}</td>
                  <td className="px-5 py-2 text-xs text-slate-700">{row.actor_role ?? '—'}</td>
                  <td className="px-5 py-2 font-mono text-xs font-bold text-slate-900">{row.action}</td>
                  <td className="px-5 py-2 text-xs text-slate-600">
                    {row.target_type ? `${row.target_type}${row.target_id ? `:${String(row.target_id).slice(0, 8)}` : ''}` : '—'}
                  </td>
                  <td className="px-5 py-2 text-[11px] text-slate-500 max-w-md truncate font-mono">
                    {row.diff ? JSON.stringify(row.diff).slice(0, 100) : '—'}
                  </td>
                </tr>
              ))}
              {(audit.data ?? []).length === 0 && !audit.isLoading && (
                <tr><td colSpan={6} className="text-center text-sm text-slate-500 py-8">No matching audit entries.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}

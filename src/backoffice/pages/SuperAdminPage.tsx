import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X } from 'lucide-react';
import {
  listRoles, listUserRoles, listRolePermissions,
  assignRole, revokeRole,
} from '../services/rbac-service';
import { useBackofficeAuth } from '../rbac/useBackofficeAuth';
import { PERMISSIONS, ROLE_LABELS } from '../rbac/permissions';
import { RequirePermission } from '../rbac/Guard';

export default function SuperAdminPage() {
  const auth = useBackofficeAuth();
  const qc = useQueryClient();
  const canAssign = auth.hasPermission(PERMISSIONS.RBAC_ASSIGN);

  const [open, setOpen] = useState(false);

  const roles = useQuery({ queryKey: ['bos', 'rbac', 'roles'], queryFn: () => listRoles() });
  const users = useQuery({ queryKey: ['bos', 'rbac', 'users'], queryFn: () => listUserRoles() });
  const perms = useQuery({ queryKey: ['bos', 'rbac', 'perms'], queryFn: () => listRolePermissions() });

  const permsByRole = new Map<string, string[]>();
  for (const p of perms.data ?? []) {
    const arr = permsByRole.get(p.role_id) ?? [];
    arr.push(p.permission);
    permsByRole.set(p.role_id, arr);
  }

  return (
    <RequirePermission perm={PERMISSIONS.RBAC_ASSIGN}>
      <div className="space-y-8">
        <header>
          <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-1">Super Admin</p>
          <h1 className="text-3xl font-extrabold tracking-tight">User &amp; role management</h1>
          <p className="text-slate-600 mt-1 text-sm">
            Assign back-office roles. Permissions for each role come from <code className="bg-slate-100 px-1 rounded text-xs">bos_role_permissions</code> — to grant a new permission, add a row there. The wildcard <code>*</code> on super_admin short-circuits every check.
          </p>
        </header>

        {/* Role catalogue + permission map */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Role catalogue</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(roles.data ?? []).map(r => {
              const ps = permsByRole.get(r.id) ?? [];
              return (
                <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <p className="text-sm font-extrabold">{ROLE_LABELS[r.id] ?? r.label}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{r.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {ps.includes('*') ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Wildcard ★</span>
                    ) : (
                      ps.map(p => (
                        <span key={p} className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{p}</span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* User-role assignments */}
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">User assignments</h2>
            {canAssign && (
              <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-md text-xs font-bold"
              >
                <UserPlus size={12} /> Assign role
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-5 py-3 font-bold">User</th>
                  <th className="text-left px-5 py-3 font-bold">Role</th>
                  <th className="text-left px-5 py-3 font-bold">Granted</th>
                  <th className="text-right px-5 py-3 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(users.data ?? []).map(u => (
                  <tr key={`${u.user_id}:${u.role_id}`}>
                    <td className="px-5 py-2">
                      <p className="text-sm font-semibold">{u.full_name ?? u.email ?? <span className="font-mono text-xs">{u.user_id.slice(0, 8)}</span>}</p>
                      {u.email && u.full_name && <p className="text-xs text-slate-500">{u.email}</p>}
                    </td>
                    <td className="px-5 py-2 text-xs font-bold">{ROLE_LABELS[u.role_id] ?? u.role_id}</td>
                    <td className="px-5 py-2 text-xs text-slate-500">{new Date(u.granted_at).toLocaleDateString()}</td>
                    <td className="px-5 py-2 text-right">
                      <button
                        onClick={async () => {
                          if (!confirm(`Revoke ${u.role_id} from this user?`)) return;
                          await revokeRole({ userId: u.user_id, roleId: u.role_id });
                          await qc.invalidateQueries({ queryKey: ['bos', 'rbac', 'users'] });
                        }}
                        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md"
                      >
                        <X size={11} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
                {(users.data ?? []).length === 0 && !users.isLoading && (
                  <tr><td colSpan={4} className="text-center text-sm text-slate-500 py-8">No users assigned yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {open && (
          <AssignRoleDialog
            roleIds={(roles.data ?? []).map(r => r.id)}
            onClose={() => setOpen(false)}
            onAssigned={async () => { setOpen(false); await qc.invalidateQueries({ queryKey: ['bos', 'rbac', 'users'] }); }}
          />
        )}
      </div>
    </RequirePermission>
  );
}

function AssignRoleDialog({
  roleIds, onClose, onAssigned,
}: { roleIds: string[]; onClose: () => void; onAssigned: () => void }) {
  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState(roleIds[0] ?? 'support');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true); setError('');
    try {
      await assignRole({ userId: userId.trim(), roleId });
      onAssigned();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-extrabold mb-1 tracking-tight">Assign role</h2>
        <p className="text-xs text-slate-500 mb-4">Paste the user's auth.users id (UUID).</p>
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 mb-1 block">User id</span>
            <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" className="w-full border border-slate-200 rounded-md px-3 py-2 font-mono text-xs" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700 mb-1 block">Role</span>
            <select value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2">
              {roleIds.map(id => <option key={id} value={id}>{ROLE_LABELS[id] ?? id}</option>)}
            </select>
          </label>
          {error && <p className="text-rose-600 text-xs">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-md">Cancel</button>
          <button onClick={submit} disabled={busy || !userId} className="px-4 py-2 text-sm bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-md font-bold disabled:opacity-50">
            {busy ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

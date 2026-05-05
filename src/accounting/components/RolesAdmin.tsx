import { useEffect, useState } from 'react';
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { INPUT_FOCUS, FOCUS_RING } from '../../components/ds';
import {
  listRoleAssignments,
  grantFinanceRoleByEmail,
  revokeFinanceRole,
  type FinanceRoleAssignment,
} from '../service';
import type { FinanceRole } from '../types';

/* `super_admin` is intentionally excluded from this dropdown.
 * The platform has ONE super-admin tier (profiles.is_super_admin)
 * which automatically inherits every finance role via the SQL
 * bridge in fn_has_finance_role. Granting a second super_admin via
 * users_roles would create a parallel identity that's harder to
 * audit — promote the user via profiles.is_super_admin instead. */
const ROLES: { value: FinanceRole; label: string; description: string }[] = [
  { value: 'admin',          label: 'Admin',           description: 'Edit accounting, manage tax codes / FX, no destructive operations on roles.' },
  { value: 'accountant',     label: 'Accountant',      description: 'Post journal entries, edit chart of accounts, run reports.' },
  { value: 'auditor',        label: 'Auditor',         description: 'Read-only access to /audit; can leave annotations.' },
  { value: 'finance_viewer', label: 'Finance viewer',  description: 'Read-only summary access.' },
];

/**
 * AC.07 Roles — email-based role administration.
 *
 * Visible only to super-admins (platform `profiles.is_super_admin`
 * OR `users_roles.super_admin`). Lists every active finance-role
 * assignment with email + grant timestamp, and lets a super-admin
 * grant a new role by typing the user's email — no UUIDs to look up.
 */
export default function RolesAdmin() {
  const [rows,    setRows]    = useState<FinanceRoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [email,   setEmail]   = useState('');
  /* Default to 'accountant' — the most common assignment. */
  const [role,    setRole]    = useState<FinanceRole>('accountant');
  const [busy,    setBusy]    = useState(false);

  async function refresh() {
    try {
      const data = await listRoleAssignments();
      setRows(data);
    } catch (e) {
      toast.error('Could not load role assignments', { description: e instanceof Error ? e.message : '' });
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function grant() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const found = await grantFinanceRoleByEmail(email, role);
      toast.success(`Granted ${role.replace('_', ' ')} to ${found.email}`);
      setEmail('');
      void refresh();
    } catch (e) {
      toast.error('Grant failed', { description: e instanceof Error ? e.message : '' });
    } finally { setBusy(false); }
  }

  async function revoke(row: FinanceRoleAssignment) {
    if (!confirm(`Revoke ${row.role} from ${row.user_email ?? row.user_id}?`)) return;
    try {
      await revokeFinanceRole(row.user_id, row.role, row.jurisdiction);
      toast.success('Role revoked');
      void refresh();
    } catch (e) {
      toast.error('Revoke failed', { description: e instanceof Error ? e.message : '' });
    }
  }

  return (
    <div className="space-y-6">
      {/* Grant panel */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white">
        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono mb-3">Grant role by email</p>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="flex-1 min-w-[240px]">
            <span className="block text-xs text-slate-500 mb-1">User email</span>
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm ${INPUT_FOCUS}`}
            />
          </label>
          <label>
            <span className="block text-xs text-slate-500 mb-1">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as FinanceRole)}
              className={`px-3 py-2 rounded-lg border border-slate-200 text-sm ${INPUT_FOCUS}`}
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          <button
            onClick={grant}
            disabled={busy || !email.trim()}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-[#0B2E59] hover:bg-[#0F3558] text-white disabled:opacity-60 ${FOCUS_RING}`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Grant
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          {ROLES.find(r => r.value === role)?.description}
        </p>
      </div>

      {/* Assignments table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
            <tr>
              <th className="text-left  px-3 py-2">Email</th>
              <th className="text-left  px-3 py-2">Name</th>
              <th className="text-left  px-3 py-2">Role</th>
              <th className="text-left  px-3 py-2">Scope</th>
              <th className="text-left  px-3 py-2">Granted</th>
              <th />
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No explicit assignments yet.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={`${r.user_id}-${r.role}-${r.jurisdiction}-${i}`} className="border-t border-slate-100">
                <td className="px-3 py-1.5">{r.user_email ?? '—'}</td>
                <td className="px-3 py-1.5 text-slate-700">{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</td>
                <td className="px-3 py-1.5">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                    {r.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-slate-500 font-mono text-xs">{r.jurisdiction || 'all'}</td>
                <td className="px-3 py-1.5 text-slate-500 text-xs">
                  {r.granted_at ? new Date(r.granted_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <button
                    onClick={() => revoke(r)}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-bold"
                  >
                    <Trash2 className="w-3 h-3" /> Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Platform super-admins (<code className="bg-slate-100 px-1 py-0.5 rounded">profiles.is_super_admin</code>) automatically inherit all finance roles and don't appear in this table.
      </p>
    </div>
  );
}

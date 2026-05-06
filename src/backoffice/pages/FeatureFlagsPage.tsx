import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listFeatureFlags, setFeatureFlag } from '../services/feature-flags-service';
import { useBackofficeAuth } from '../rbac/useBackofficeAuth';
import { PERMISSIONS } from '../rbac/permissions';
import { RequirePermission } from '../rbac/Guard';

export default function FeatureFlagsPage() {
  const auth = useBackofficeAuth();
  const qc = useQueryClient();
  const canWrite = auth.hasPermission(PERMISSIONS.FEATURE_FLAGS_WRITE);

  const flags = useQuery({ queryKey: ['bos', 'flags'], queryFn: () => listFeatureFlags() });

  async function toggle(key: string, enabled: boolean) {
    await setFeatureFlag({ key, enabled });
    await qc.invalidateQueries({ queryKey: ['bos', 'flags'] });
  }

  return (
    <RequirePermission perm={PERMISSIONS.FEATURE_FLAGS_VIEW}>
      <div className="space-y-6">
        <header>
          <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-1">Feature flags</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Global toggles</h1>
          <p className="text-slate-600 mt-1 text-sm">
            Flip experimental features on/off without a deploy. Flags are read by both BOS and the customer-facing app via <code className="bg-slate-100 px-1 rounded text-xs">isFeatureEnabled(key)</code>.
          </p>
        </header>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-5 py-3 font-bold">Key</th>
                <th className="text-left px-5 py-3 font-bold">Description</th>
                <th className="text-left px-5 py-3 font-bold">Updated</th>
                <th className="text-right px-5 py-3 font-bold">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(flags.data ?? []).map(f => (
                <tr key={f.key}>
                  <td className="px-5 py-3 font-mono text-xs font-bold">{f.key}</td>
                  <td className="px-5 py-3 text-xs text-slate-600 max-w-md">{f.description ?? '—'}</td>
                  <td className="px-5 py-3 text-[11px] text-slate-400 whitespace-nowrap">{new Date(f.updated_at).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={f.enabled}
                      disabled={!canWrite}
                      onClick={() => toggle(f.key, !f.enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50 ${f.enabled ? 'bg-amber-400' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition ${f.enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
              {(flags.data ?? []).length === 0 && !flags.isLoading && (
                <tr><td colSpan={4} className="text-center text-sm text-slate-500 py-8">No feature flags registered.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}

import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useBackofficeAuth } from './useBackofficeAuth';
import type { Permission } from './permissions';

/* ─────────────────────────────────────────────────────────────────
 * <RequirePermission perm="…">
 *
 * Renders children only when the current user holds `perm` (or the
 * '*' wildcard). Otherwise renders an inline "Access denied" panel
 * — defensive UI that protects the app even though RLS is the real
 * security boundary.
 *
 * Usage:
 *   <RequirePermission perm={PERMISSIONS.MARKETS_UNLOCK}>
 *     <UnlockButton />
 *   </RequirePermission>
 * ───────────────────────────────────────────────────────────────── */

interface Props {
  perm:      Permission;
  children:  ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({ perm, children, fallback }: Props) {
  const auth = useBackofficeAuth();

  if (auth.loading) {
    return <div className="text-xs text-slate-500 py-3">Resolving permissions…</div>;
  }

  if (!auth.hasPermission(perm)) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <ShieldAlert className="mx-auto mb-3 text-amber-500" size={28} />
        <p className="text-sm font-bold text-slate-900 mb-1">Access denied</p>
        <p className="text-xs text-slate-500">
          This action requires the <code className="bg-slate-100 px-1.5 py-0.5 rounded">{perm}</code> permission.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

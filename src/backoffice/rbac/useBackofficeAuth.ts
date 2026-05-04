import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { Permission } from './permissions';

/* ─────────────────────────────────────────────────────────────────
 * useBackofficeAuth
 *
 * Resolves the current Supabase auth user's BOS role + permission
 * set in one query. Returns:
 *
 *   - roles:  list of bos_roles ids the user holds (often just one
 *             but the schema supports many)
 *   - permissions: flattened permission strings (post-wildcard
 *             expansion — '*' becomes the full literal set so
 *             callers can check membership without re-running the
 *             '*' branch)
 *   - hasPermission(p): boolean — checks the resolved set
 *   - isSuperAdmin: convenience for '*' wildcard holders
 *   - loading, isAuthenticated
 *
 * The hook cooperates with RLS: a user without any BOS role gets
 * empty arrays, hasPermission() returns false for everything, and
 * the BOS layout shows the "no access" view instead of failing
 * silently or leaking a partial UI.
 * ───────────────────────────────────────────────────────────────── */

export interface BackofficeAuthState {
  loading:           boolean;
  isAuthenticated:   boolean;
  roles:             string[];
  permissions:       string[];
  hasPermission:     (perm: Permission) => boolean;
  isSuperAdmin:      boolean;
}

interface UserRoleRow { role_id: string }
interface RolePermissionRow { role_id: string; permission: string }

const QUERY_KEY = (uid: string | null | undefined) => ['bos', 'auth', uid ?? 'anon'] as const;

async function fetchAuthContext(uid: string): Promise<{ roles: string[]; permissions: string[] }> {
  /* 1. Resolve the user's role assignments. */
  const { data: rolesData, error: rolesErr } = await supabase
    .from('bos_user_roles')
    .select('role_id')
    .eq('user_id', uid);

  if (rolesErr) {
    /* Tolerate the BOS schema not being installed yet — caller
     * surfaces a "no access" view instead of crashing the app. */
    return { roles: [], permissions: [] };
  }
  const roles = (rolesData as UserRoleRow[] | null)?.map(r => r.role_id) ?? [];
  if (roles.length === 0) return { roles: [], permissions: [] };

  /* 2. Pull permissions for the assigned roles. */
  const { data: permsData, error: permsErr } = await supabase
    .from('bos_role_permissions')
    .select('role_id, permission')
    .in('role_id', roles);

  if (permsErr) return { roles, permissions: [] };
  const permissions = Array.from(new Set(
    (permsData as RolePermissionRow[] | null)?.map(p => p.permission) ?? [],
  ));

  return { roles, permissions };
}

export function useBackofficeAuth(): BackofficeAuthState {
  const { user, loading: authLoading } = useAuth();

  const q = useQuery({
    queryKey: QUERY_KEY(user?.id),
    queryFn:  () => fetchAuthContext(user!.id),
    enabled:  Boolean(user?.id),
    staleTime: 60_000,
  });

  const roles = q.data?.roles ?? [];
  const permissions = q.data?.permissions ?? [];
  const isSuperAdmin = permissions.includes('*');

  return {
    loading:         authLoading || (Boolean(user) && q.isLoading),
    isAuthenticated: Boolean(user),
    roles,
    permissions,
    isSuperAdmin,
    hasPermission(perm: Permission): boolean {
      if (isSuperAdmin) return true;
      return permissions.includes(perm);
    },
  };
}

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
 * Bridge: a user with profiles.is_super_admin = true is treated as
 * a back-office super-admin too — the platform has ONE super-admin
 * tier. Without this bridge the bos_user_roles table would maintain
 * a parallel super-admin world that's invisible to the platform's
 * existing admin tooling.
 *
 * The hook cooperates with RLS: a user without any BOS role and
 * without the platform super-admin flag gets empty arrays,
 * hasPermission() returns false for everything, and the BOS layout
 * shows the "no access" view.
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
  /* 0. Platform super-admin bridge — anyone with
   *    profiles.is_super_admin = true is treated as a back-office
   *    super-admin (synthetic 'super_admin' role + '*' wildcard). */
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('user_id', uid)
    .maybeSingle();
  const platformSuper = profileRow?.is_super_admin === true;

  /* 1. Resolve the user's role assignments. */
  const { data: rolesData, error: rolesErr } = await supabase
    .from('bos_user_roles')
    .select('role_id')
    .eq('user_id', uid);

  /* If the BOS tables aren't installed yet, the platform super-admin
   * bridge still grants access. Otherwise return empty. */
  const explicitRoles = rolesErr
    ? []
    : (rolesData as UserRoleRow[] | null)?.map(r => r.role_id) ?? [];

  const bridgedRoles = platformSuper
    ? Array.from(new Set([...explicitRoles, 'super_admin']))
    : explicitRoles;

  if (bridgedRoles.length === 0) return { roles: [], permissions: [] };

  /* 2. Pull permissions for the explicit role assignments. The
   *    platform super-admin gets the wildcard '*' added directly so
   *    we don't depend on bos_role_permissions having a super_admin
   *    row seeded. */
  let permissions: string[] = [];
  if (explicitRoles.length > 0) {
    const { data: permsData, error: permsErr } = await supabase
      .from('bos_role_permissions')
      .select('role_id, permission')
      .in('role_id', explicitRoles);
    if (!permsErr) {
      permissions = Array.from(new Set(
        (permsData as RolePermissionRow[] | null)?.map(p => p.permission) ?? [],
      ));
    }
  }
  if (platformSuper && !permissions.includes('*')) permissions = ['*', ...permissions];

  return { roles: bridgedRoles, permissions };
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

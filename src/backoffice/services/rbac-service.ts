import { supabase } from '../../lib/supabase';
import { recordAudit } from './audit-service';

export interface BosRole {
  id:           string;
  label:        string;
  description:  string | null;
  created_at:   string;
}

export interface BosUserRole {
  user_id:    string;
  role_id:    string;
  granted_at: string;
  granted_by: string | null;
}

export interface BosUserWithProfile extends BosUserRole {
  email?:     string | null;
  full_name?: string | null;
}

export async function listRoles(): Promise<BosRole[]> {
  const { data, error } = await supabase.from('bos_roles').select('*').order('id');
  if (error) return [];
  return (data as BosRole[]) ?? [];
}

/**
 * Resolve a user's auth.users id from their email or phone. Used by
 * the SuperAdmin assign-role dialog so non-IT operators don't have
 * to paste UUIDs. Returns null when no profile matches; throws when
 * Supabase itself errors. Queries are case-insensitive on email and
 * tolerant of whitespace on both fields.
 */
export async function findUserIdByContact(args: {
  email?: string | null;
  phone?: string | null;
}): Promise<string | null> {
  const email = args.email?.trim().toLowerCase() || null;
  const phone = args.phone?.trim() || null;
  if (!email && !phone) return null;

  let query = supabase.from('profiles').select('user_id').limit(1);
  if (email) query = query.ilike('email', email);
  if (phone) query = query.eq('phone', phone);

  const { data, error } = await query;
  if (error) throw error;
  return data && data.length > 0 ? (data[0] as { user_id: string }).user_id : null;
}

export async function listRolePermissions(): Promise<{ role_id: string; permission: string }[]> {
  const { data, error } = await supabase.from('bos_role_permissions').select('role_id, permission');
  if (error) return [];
  return data ?? [];
}

/**
 * List user→role assignments enriched with the user's email + name
 * pulled from the existing `profiles` table. Falls back to bare
 * assignment rows when profiles is unavailable.
 */
export async function listUserRoles(): Promise<BosUserWithProfile[]> {
  const { data, error } = await supabase
    .from('bos_user_roles')
    .select('user_id, role_id, granted_at, granted_by')
    .order('granted_at', { ascending: false });

  if (error || !data) return [];

  /* Enrich with profile data — best-effort. */
  const userIds = Array.from(new Set(data.map(r => r.user_id)));
  if (userIds.length === 0) return data as BosUserWithProfile[];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .in('id', userIds);

  const profileById = new Map<string, { email?: string; first_name?: string; last_name?: string }>();
  for (const p of (profiles ?? [])) {
    profileById.set(p.id as string, p as { email?: string; first_name?: string; last_name?: string });
  }

  return data.map(r => {
    const p = profileById.get(r.user_id);
    return {
      ...r,
      email:     p?.email ?? null,
      full_name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || null : null,
    };
  });
}

export async function assignRole(input: { userId: string; roleId: string }): Promise<void> {
  const { error } = await supabase.from('bos_user_roles').insert({
    user_id: input.userId,
    role_id: input.roleId,
  });
  if (error) throw error;
  await recordAudit({
    action:      'rbac.role.assign',
    targetType:  'user',
    targetId:    input.userId,
    diff:        { role_id: input.roleId },
  });
}

export async function revokeRole(input: { userId: string; roleId: string }): Promise<void> {
  const { error } = await supabase
    .from('bos_user_roles')
    .delete()
    .eq('user_id', input.userId)
    .eq('role_id', input.roleId);
  if (error) throw error;
  await recordAudit({
    action:      'rbac.role.revoke',
    targetType:  'user',
    targetId:    input.userId,
    diff:        { role_id: input.roleId },
  });
}

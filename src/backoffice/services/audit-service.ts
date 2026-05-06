import { supabase } from '../../lib/supabase';

/* ─────────────────────────────────────────────────────────────────
 * BOS audit log service
 *
 * Audit entries are append-only. The schema's RLS allows insert by
 * any authenticated user (with an actor_id check) and select by
 * holders of `audit.view`. There is no UPDATE or DELETE policy —
 * once written, an entry cannot be modified or removed via the
 * public API.
 *
 * Every state-changing BOS service should call recordAudit() after
 * a successful mutation so the trail is complete. The helper is
 * fire-and-forget by default — audit logging must never block the
 * happy path of the action it's tracking.
 * ───────────────────────────────────────────────────────────────── */

export interface AuditEntry {
  id:           string;
  actor_id:     string | null;
  actor_role:   string | null;
  action:       string;
  target_type:  string | null;
  target_id:    string | null;
  diff:         Record<string, unknown> | null;
  ip_address:   string | null;
  user_agent:   string | null;
  occurred_at:  string;
}

interface RecordAuditInput {
  action:       string;
  targetType?:  string;
  targetId?:    string;
  /** Before / after snapshots of the changed object. JSON-serialisable. */
  diff?:        Record<string, unknown>;
  /** Role used to perform the action (denormalised for fast filtering). */
  actorRole?:   string;
}

/**
 * Insert an audit row. Best-effort — never throws to the caller.
 * The actor_id is read from the active Supabase session (auth.uid())
 * via RLS, so we don't need to pass it explicitly.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('bos_audit_log').insert({
      actor_id:    user?.id ?? null,
      actor_role:  input.actorRole ?? null,
      action:      input.action,
      target_type: input.targetType ?? null,
      target_id:   input.targetId ?? null,
      diff:        input.diff ?? null,
      ip_address:  null,        /* Server-side only — populate via edge function if needed. */
      user_agent:  userAgent,
    });
  } catch {
    /* Audit-log write failures must never bubble up. The action
     * already succeeded; missing one log row is preferable to
     * inverting the user-visible result. */
  }
}

interface ListAuditOptions {
  /** Filter by action prefix, e.g. 'markets.' */
  action?:       string;
  /** Filter by target_type. */
  targetType?:   string;
  /** Filter by actor user id. */
  actorId?:      string;
  /** ISO date strings — inclusive range. */
  from?:         string;
  to?:           string;
  /** Default 100, max 500. */
  limit?:        number;
}

/**
 * Read audit entries with optional filters. RLS enforces the
 * audit.view permission — service-side filters are conveniences,
 * not security boundaries.
 */
export async function listAudit(opts: ListAuditOptions = {}): Promise<AuditEntry[]> {
  let q = supabase
    .from('bos_audit_log')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(Math.min(opts.limit ?? 100, 500));

  if (opts.action)     q = q.like('action', `${opts.action}%`);
  if (opts.targetType) q = q.eq('target_type', opts.targetType);
  if (opts.actorId)    q = q.eq('actor_id', opts.actorId);
  if (opts.from)       q = q.gte('occurred_at', opts.from);
  if (opts.to)         q = q.lte('occurred_at', opts.to);

  const { data, error } = await q;
  if (error) return [];
  return (data as AuditEntry[]) ?? [];
}

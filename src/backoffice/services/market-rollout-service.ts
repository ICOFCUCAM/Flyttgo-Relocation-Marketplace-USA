import { supabase } from '../../lib/supabase';
import { recordAudit } from './audit-service';

export type MarketStatus = 'locked' | 'pilot' | 'live';

export interface MarketRolloutRow {
  id:           string;
  country_code: string;
  city_slug:    string | null;
  status:       MarketStatus;
  unlocked_at:  string | null;
  unlocked_by:  string | null;
  notes:        string | null;
  updated_at:   string;
}

export async function listMarketRollout(): Promise<MarketRolloutRow[]> {
  const { data, error } = await supabase
    .from('bos_market_rollout')
    .select('*')
    .order('country_code, city_slug');
  if (error) return [];
  return (data as MarketRolloutRow[]) ?? [];
}

interface SetStatusInput {
  id:     string;
  status: MarketStatus;
  notes?: string;
}

/**
 * Update rollout status. RLS gates the write on the `markets.unlock`
 * permission; assigning a non-permitted user to call this throws.
 * On success, the audit log captures the diff.
 */
export async function setMarketStatus(input: SetStatusInput): Promise<MarketRolloutRow | null> {
  /* Read current row for the audit diff. */
  const { data: before } = await supabase
    .from('bos_market_rollout')
    .select('*')
    .eq('id', input.id)
    .single();

  const patch: Record<string, unknown> = {
    status:     input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.status !== 'locked') {
    /* Unlock event — stamp the actor. RLS provides auth.uid()
     * server-side, but storing it on the row makes audit reads
     * simpler. */
    const { data: { user } } = await supabase.auth.getUser();
    patch.unlocked_at = new Date().toISOString();
    patch.unlocked_by = user?.id ?? null;
  } else {
    patch.unlocked_at = null;
    patch.unlocked_by = null;
  }

  const { data, error } = await supabase
    .from('bos_market_rollout')
    .update(patch)
    .eq('id', input.id)
    .select()
    .single();

  if (error) throw error;

  await recordAudit({
    action:      'markets.status.set',
    targetType:  'market',
    targetId:    input.id,
    diff:        {
      before: before ? { status: (before as MarketRolloutRow).status } : null,
      after:  { status: input.status, notes: input.notes },
    },
  });

  return (data as MarketRolloutRow) ?? null;
}

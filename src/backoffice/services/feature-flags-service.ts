import { supabase } from '../../lib/supabase';
import { recordAudit } from './audit-service';

export interface FeatureFlag {
  key:         string;
  enabled:     boolean;
  description: string | null;
  updated_at:  string;
  updated_by:  string | null;
}

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from('bos_feature_flags')
    .select('*')
    .order('key');
  if (error) return [];
  return (data as FeatureFlag[]) ?? [];
}

export async function setFeatureFlag(input: { key: string; enabled: boolean }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('bos_feature_flags')
    .update({
      enabled:    input.enabled,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    .eq('key', input.key);
  if (error) throw error;

  await recordAudit({
    action:      'feature_flag.toggle',
    targetType:  'feature_flag',
    targetId:    input.key,
    diff:        { enabled: input.enabled },
  });
}

/**
 * Public read — checks if a flag is enabled. Returns false on any
 * error so a missing schema or RLS rejection results in the safe
 * default ("flag off"). Use this from non-BOS surfaces that just
 * need to know whether to surface a feature.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('bos_feature_flags')
    .select('enabled')
    .eq('key', key)
    .single();
  if (error || !data) return false;
  return Boolean((data as { enabled: boolean }).enabled);
}

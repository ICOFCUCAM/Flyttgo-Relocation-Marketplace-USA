import { supabase } from './supabase';

/* ─────────────────────────────────────────────────────────────────
 * Provider pricing settings — typed wrapper around the
 * `provider_pricing` Supabase table (see docs/install-pricing-engine.sql).
 *
 * One row per signed-in provider. The Pricing Settings page in the
 * driver portal reads this row on mount, lets the provider edit, and
 * writes it back via upsert. RLS on the table guarantees the row's
 * user_id always matches auth.uid() so we don't have to enforce that
 * client-side.
 *
 * Defaults (when no row exists yet) mirror the DB column defaults so
 * a never-edited provider's "current settings" panel never reads as
 * blank — it shows the platform defaults until they save once.
 * ───────────────────────────────────────────────────────────────── */

export interface ProviderPricingRow {
  id?:                          string;
  user_id?:                     string;
  service_radius_km:            number;
  available_crew_sizes:         (2 | 3 | 4 | 5)[];
  truck_available:              boolean;
  packing_available:            boolean;
  storage_available:            boolean;
  hourly_base_override:         number | null;
  weekend_multiplier_override:  number | null;
  truck_per_hour_override:      number | null;
  packing_per_hour_override:    number | null;
  created_at?:                  string;
  updated_at?:                  string;
}

export const PROVIDER_PRICING_DEFAULTS: ProviderPricingRow = {
  service_radius_km:            25,
  available_crew_sizes:         [2, 3],
  truck_available:              true,
  packing_available:            false,
  storage_available:            false,
  hourly_base_override:         null,
  weekend_multiplier_override:  null,
  truck_per_hour_override:      null,
  packing_per_hour_override:    null,
};

/**
 * Load the signed-in provider's pricing row. Returns the defaults
 * shape (with user_id stamped) if no row exists yet — callers should
 * treat the response as authoritative without checking for null.
 */
export async function loadProviderPricing(userId: string): Promise<ProviderPricingRow> {
  const { data, error } = await supabase
    .from('provider_pricing')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`loadProviderPricing failed: ${error.message}`);
  if (!data)  return { ...PROVIDER_PRICING_DEFAULTS, user_id: userId };

  return {
    ...PROVIDER_PRICING_DEFAULTS,
    ...data,
    /* Postgres returns SMALLINT[] as number[] — keep the typed union
     * so the React form can dispatch by literal value. */
    available_crew_sizes: (data.available_crew_sizes ?? PROVIDER_PRICING_DEFAULTS.available_crew_sizes)
      .filter((n: number) => [2, 3, 4, 5].includes(n)) as (2 | 3 | 4 | 5)[],
  };
}

/**
 * Upsert the provider's row. RLS rejects writes where user_id !=
 * auth.uid(), so we don't have to enforce it client-side. The DB
 * trigger touches updated_at on every UPDATE.
 */
export async function saveProviderPricing(
  userId:  string,
  patch:   Partial<ProviderPricingRow>,
): Promise<ProviderPricingRow> {
  const row: Partial<ProviderPricingRow> & { user_id: string } = {
    ...patch,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from('provider_pricing')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(`saveProviderPricing failed: ${error.message}`);
  return {
    ...PROVIDER_PRICING_DEFAULTS,
    ...data,
    available_crew_sizes: (data.available_crew_sizes ?? PROVIDER_PRICING_DEFAULTS.available_crew_sizes)
      .filter((n: number) => [2, 3, 4, 5].includes(n)) as (2 | 3 | 4 | 5)[],
  };
}

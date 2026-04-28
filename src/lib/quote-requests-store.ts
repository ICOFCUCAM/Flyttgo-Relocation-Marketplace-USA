import { supabase } from './supabase';
import type { PricingCountry } from './pricing-engine';
import type { ProviderCategorySlug } from './provider-categories';

/* ─────────────────────────────────────────────────────────────────
 * Typed CRUD wrapper around the quote_requests + provider_quotes
 * Supabase tables (see docs/install-quote-requests.sql).
 *
 * Two-side store: customers create requests + read quotes on them;
 * providers list open requests in their market + submit quotes.
 * RLS enforces both halves — the client just calls the right
 * helpers.
 * ───────────────────────────────────────────────────────────────── */

export type QuoteRequestStatus =
  | 'open' | 'quoting' | 'accepted' | 'expired' | 'cancelled';

export type ProviderQuoteStatus =
  | 'submitted' | 'accepted' | 'declined' | 'withdrawn' | 'expired';

export interface QuoteRequestBrief {
  bedrooms?:        number;
  inventoryNote?:   string;
  stairs?:          number;
  expectedHours?:   number;
  fragileItems?:    boolean;
  packingNeeded?:   boolean;
  contactPref?:     'email' | 'phone' | 'whatsapp';
  /* Free for category-specific extras (e.g. corporate cost-centre,
   * international destination customs notes). */
  [key: string]:    unknown;
}

export interface QuoteRequestRow {
  id:                  string;
  user_id:             string;
  country:             PricingCountry;
  category:            ProviderCategorySlug;
  pickup_address:      string;
  pickup_city?:        string | null;
  dropoff_address:     string;
  dropoff_city?:       string | null;
  move_date?:          string | null;        // ISO date
  brief:               QuoteRequestBrief;
  status:              QuoteRequestStatus;
  accepted_quote_id?:  string | null;
  expires_at:          string;
  created_at:          string;
  updated_at:          string;
}

export interface ProviderQuoteRow {
  id:                  string;
  request_id:          string;
  provider_user_id:    string;
  amount_total:        number;
  deposit_pct:         number;
  note?:               string | null;
  valid_until:         string;
  status:              ProviderQuoteStatus;
  created_at:          string;
  updated_at:          string;
}

/* ── Customer-side ───────────────────────────────────────────────── */

export type CreateQuoteRequestInput = Omit<QuoteRequestRow,
  'id' | 'user_id' | 'status' | 'accepted_quote_id' | 'expires_at' | 'created_at' | 'updated_at'>;

export async function createQuoteRequest(
  userId: string,
  input:  CreateQuoteRequestInput,
): Promise<QuoteRequestRow> {
  const { data, error } = await supabase
    .from('quote_requests')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(`createQuoteRequest failed: ${error.message}`);
  return data as QuoteRequestRow;
}

export async function listMyQuoteRequests(userId: string): Promise<QuoteRequestRow[]> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listMyQuoteRequests failed: ${error.message}`);
  return (data ?? []) as QuoteRequestRow[];
}

export async function listQuotesForRequest(requestId: string): Promise<ProviderQuoteRow[]> {
  const { data, error } = await supabase
    .from('provider_quotes')
    .select('*')
    .eq('request_id', requestId)
    .order('amount_total', { ascending: true });
  if (error) throw new Error(`listQuotesForRequest failed: ${error.message}`);
  return (data ?? []) as ProviderQuoteRow[];
}

export async function acceptProviderQuote(quoteId: string): Promise<string> {
  const { data, error } = await supabase
    .rpc('accept_provider_quote', { p_quote_id: quoteId });
  if (error) throw new Error(`acceptProviderQuote failed: ${error.message}`);
  /* RPC returns the request_id (uuid). */
  return data as string;
}

export async function cancelQuoteRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('quote_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);
  if (error) throw new Error(`cancelQuoteRequest failed: ${error.message}`);
}

/* ── Provider-side ───────────────────────────────────────────────── */

export async function listOpenRequestsForProvider(country: PricingCountry): Promise<QuoteRequestRow[]> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('country', country)
    .in('status', ['open', 'quoting'])
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listOpenRequestsForProvider failed: ${error.message}`);
  return (data ?? []) as QuoteRequestRow[];
}

export async function submitProviderQuote(
  providerUserId: string,
  requestId:      string,
  payload:        Pick<ProviderQuoteRow, 'amount_total' | 'deposit_pct' | 'note' | 'valid_until'>,
): Promise<ProviderQuoteRow> {
  const { data, error } = await supabase
    .from('provider_quotes')
    .upsert(
      { ...payload, request_id: requestId, provider_user_id: providerUserId, status: 'submitted' },
      { onConflict: 'request_id,provider_user_id' },
    )
    .select()
    .single();
  if (error) throw new Error(`submitProviderQuote failed: ${error.message}`);
  /* Bump parent request to 'quoting' so the customer sees activity. */
  await supabase
    .from('quote_requests')
    .update({ status: 'quoting' })
    .eq('id', requestId)
    .eq('status', 'open');
  return data as ProviderQuoteRow;
}

export async function withdrawProviderQuote(quoteId: string): Promise<void> {
  const { error } = await supabase
    .from('provider_quotes')
    .update({ status: 'withdrawn' })
    .eq('id', quoteId);
  if (error) throw new Error(`withdrawProviderQuote failed: ${error.message}`);
}

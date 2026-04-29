import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { ZShortString, parseOrThrow } from './_schemas';

export type QuoteRow = Record<string, unknown> & { id: string };

/** Minimum-trust schema for quote-request inserts. The table has many
 *  optional columns we don't want to over-constrain here, so we cap
 *  string lengths and require a country/segment. Tighten as the
 *  table evolves. */
export const CreateQuoteRequestSchema = z.object({
  country:  ZShortString('country', 8),
  segment:  ZShortString('segment', 60).optional(),
  city:     z.string().trim().max(120).optional(),
  brief:    z.record(z.unknown()).optional(),
}).catchall(z.unknown()); // tolerate extra columns

export type CreateQuoteRequestInput = z.infer<typeof CreateQuoteRequestSchema>;

/** Insert a new quote-request row. Returns the inserted row. */
export async function createQuoteRequest(rawPayload: CreateQuoteRequestInput): Promise<QuoteRow> {
  const payload = parseOrThrow(CreateQuoteRequestSchema, rawPayload);
  const { data, error } = await supabase
    .from('quote_requests')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as QuoteRow;
}

/** Quote requests visible to the current user (RLS enforces scope). */
export async function listMyQuoteRequests(): Promise<QuoteRow[]> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuoteRow[];
}

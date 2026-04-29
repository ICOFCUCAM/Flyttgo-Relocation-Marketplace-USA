import { supabase } from '../lib/supabase';

export type QuoteRow = Record<string, any> & { id: string };

/** Insert a new quote-request row. Returns the inserted row. */
export async function createQuoteRequest(payload: Record<string, any>): Promise<QuoteRow> {
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

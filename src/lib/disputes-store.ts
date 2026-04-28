import { supabase } from './supabase';
import type { PricingCountry } from './pricing-engine';
import type { DisputeCategorySlug, ResolutionPath } from './dispute-rules';

/* ─────────────────────────────────────────────────────────────────
 * Typed CRUD wrapper around the disputes / dispute_evidence /
 * dispute_resolutions Supabase tables (see docs/install-disputes.sql).
 * ───────────────────────────────────────────────────────────────── */

export type DisputeStatus =
  | 'open' | 'under_review' | 'resolved' | 'closed_no_action' | 'escalated';

export type EvidenceKind =
  | 'photo' | 'video' | 'receipt' | 'chat_screenshot'
  | 'inventory_list' | 'timeline_note' | 'arrival_proof' | 'other';

export interface DisputeRow {
  id:                 string;
  booking_id:         string;
  customer_user_id:   string;
  provider_user_id?:  string | null;
  country:            PricingCountry;
  category_slug:      DisputeCategorySlug;
  summary:            string;
  status:             DisputeStatus;
  suggested_path?:    ResolutionPath | null;
  suggested_pct?:     number | null;
  final_path?:        ResolutionPath | null;
  final_pct?:         number | null;
  final_amount?:      number | null;
  filed_at:           string;
  review_due_at:      string;
  resolved_at?:       string | null;
  created_at:         string;
  updated_at:         string;
}

export interface DisputeEvidenceRow {
  id:                 string;
  dispute_id:         string;
  uploader_role:      'customer' | 'provider' | 'admin';
  uploader_user_id:   string;
  kind:               EvidenceKind;
  file_url?:          string | null;
  note?:              string | null;
  created_at:         string;
}

export interface FileDisputeInput {
  bookingId:        string;
  country:          PricingCountry;
  category:         DisputeCategorySlug;
  summary:          string;
  providerUserId?:  string;
}

/** File a new dispute via the file_dispute() RPC.
 *  The RPC computes the suggested resolution path + pct from the
 *  country × category template, so the client doesn't need to. */
export async function fileDispute(input: FileDisputeInput): Promise<string> {
  const { data, error } = await supabase.rpc('file_dispute', {
    p_booking_id:    input.bookingId,
    p_country:       input.country,
    p_category:      input.category,
    p_summary:       input.summary,
    p_provider_user: input.providerUserId ?? null,
  });
  if (error) throw new Error(`fileDispute failed: ${error.message}`);
  return data as string;
}

export async function listMyDisputes(userId: string): Promise<DisputeRow[]> {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('customer_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listMyDisputes failed: ${error.message}`);
  return (data ?? []) as DisputeRow[];
}

export async function listDisputeEvidence(disputeId: string): Promise<DisputeEvidenceRow[]> {
  const { data, error } = await supabase
    .from('dispute_evidence')
    .select('*')
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`listDisputeEvidence failed: ${error.message}`);
  return (data ?? []) as DisputeEvidenceRow[];
}

export interface AddEvidenceInput {
  disputeId:        string;
  uploaderUserId:   string;
  uploaderRole:     'customer' | 'provider' | 'admin';
  kind:             EvidenceKind;
  fileUrl?:         string;
  note?:            string;
}

export async function addDisputeEvidence(input: AddEvidenceInput): Promise<DisputeEvidenceRow> {
  const { data, error } = await supabase
    .from('dispute_evidence')
    .insert({
      dispute_id:       input.disputeId,
      uploader_user_id: input.uploaderUserId,
      uploader_role:    input.uploaderRole,
      kind:             input.kind,
      file_url:         input.fileUrl ?? null,
      note:             input.note ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`addDisputeEvidence failed: ${error.message}`);
  return data as DisputeEvidenceRow;
}

/** Upload an evidence file to the `dispute-evidence` storage bucket
 *  under `${dispute_id}/${user_id}/${uuid}.${ext}` and return the
 *  storage path. The caller should then write a dispute_evidence
 *  row pointing at this path via addDisputeEvidence(). */
export async function uploadDisputeEvidenceFile(
  disputeId:  string,
  userId:     string,
  file:       File,
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().slice(0, 8);
  const key = `${disputeId}/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('dispute-evidence')
    .upload(key, file, { upsert: false, cacheControl: '3600' });
  if (error) throw new Error(`uploadDisputeEvidenceFile failed: ${error.message}`);
  return key;
}

import { supabase } from './supabase';

/* ─────────────────────────────────────────────────────────────────
 * Typed wrapper around the rfp_submissions table.
 *
 * Anon visitors can submit without signing in (RLS allows it). The
 * platform's procurement queue picks up new rows via admin reads.
 * Document uploads land in the `rfp-attachments` storage bucket;
 * uploadRfpAttachment() returns the storage path which the caller
 * passes to submitRfp() as document_url.
 * ───────────────────────────────────────────────────────────────── */

export type RfpSector =
  | 'corporate' | 'enterprise' | 'university' | 'municipal'
  | 'government' | 'embassy' | 'ngo' | 'transit-authority' | 'other';

export type RfpTimeline = 'asap' | '30d' | '90d' | '6m' | '12m+';

export type RfpBudgetRange = '0-25k' | '25-100k' | '100-500k' | '500k+';

export interface RfpSubmissionInput {
  organizationName:   string;
  country:            string;          // ISO-2 lowercase
  sector:             RfpSector;
  deploymentType:     string;
  timeline:           RfpTimeline;
  budgetRangeUsd?:    RfpBudgetRange;
  documentUrl?:       string;          // storage path
  contactPerson:      string;
  contactEmail:       string;
  contactPhone?:      string;
  notes?:             string;
}

export interface RfpSubmissionRow {
  id:                  string;
  organization_name:   string;
  country:             string;
  sector:              RfpSector;
  deployment_type:     string;
  timeline:            RfpTimeline;
  budget_range_usd?:   RfpBudgetRange | null;
  document_url?:       string | null;
  contact_person:      string;
  contact_email:       string;
  contact_phone?:      string | null;
  notes?:              string | null;
  status:              'new' | 'triaged' | 'in_review' | 'responded' | 'won' | 'lost' | 'withdrawn';
  created_at:          string;
}

export async function submitRfp(input: RfpSubmissionInput): Promise<RfpSubmissionRow> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id ?? null;

  const { data, error } = await supabase
    .from('rfp_submissions')
    .insert({
      submitted_by_user_id: userId,
      organization_name:    input.organizationName,
      country:              input.country.toLowerCase(),
      sector:               input.sector,
      deployment_type:      input.deploymentType,
      timeline:             input.timeline,
      budget_range_usd:     input.budgetRangeUsd ?? null,
      document_url:         input.documentUrl ?? null,
      contact_person:       input.contactPerson,
      contact_email:        input.contactEmail.trim().toLowerCase(),
      contact_phone:        input.contactPhone ?? null,
      notes:                input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`submitRfp failed: ${error.message}`);
  return data as RfpSubmissionRow;
}

/**
 * Upload an RFP attachment (typically the requesting institution's
 * brief / spec / framework draft) to the `rfp-attachments` bucket.
 * Returns the storage path the caller stores in document_url.
 *
 * Files are namespaced by a fresh uuid prefix per upload so two
 * submissions can't collide. We don't have an authenticated
 * user context guaranteed (anon submissions are allowed), so the
 * uuid prefix doubles as the access token.
 */
export async function uploadRfpAttachment(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().slice(0, 8);
  const path = `${crypto.randomUUID()}/${file.name.replace(/\s+/g, '-').toLowerCase().slice(0, 96)}.${ext}`;
  const { error } = await supabase.storage
    .from('rfp-attachments')
    .upload(path, file, { upsert: false, cacheControl: '3600' });
  if (error) throw new Error(`uploadRfpAttachment failed: ${error.message}`);
  return path;
}

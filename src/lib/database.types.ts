/* ─────────────────────────────────────────────────────────────────
 * FlyttGo · hand-rolled Supabase row types
 *
 * STATUS: Manual curation, not auto-generated. Mirrors the shape of
 * the official `supabase gen types typescript` output so that running
 * the generator later is a one-shot replacement, not a refactor.
 *
 * Coverage policy:
 *   - Every column the application *reads or writes* is typed.
 *   - Columns that exist in the SQL but the app never touches are
 *     omitted intentionally — narrower types catch more bugs.
 *   - JSONB columns that the app inspects are typed as
 *     `Record<string, unknown>` (or a stricter shape where we know
 *     the keys); never `any`.
 *
 * Convention:
 *   - Row    — what `select` returns. Server-managed columns are
 *              non-optional.
 *   - Insert — what `insert` accepts. Generated / defaulted columns
 *              are optional.
 *   - Update — partial of Row. Used by `update()` calls.
 *
 * Source of truth for the schema: docs/install-*.sql migrations
 * + the column inventory of services/* / hooks/queries/*.
 *
 * When `supabase gen types typescript` finally lands in CI, replace
 * the body of the `Database` namespace below with its output.
 * ───────────────────────────────────────────────────────────────── */

/* ─── Shared scalar types ──────────────────────────────────────── */

export type UUID         = string;
export type Timestamptz  = string;
export type DateString   = string;
export type Json         = string | number | boolean | null | { [k: string]: Json } | Json[];
export type JsonObject   = { [k: string]: Json };

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'driver_assigned'
  | 'pickup_arrived'
  | 'loading'
  | 'in_transit'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'escrow'
  | 'released'
  | 'refunded';

export type EscrowStatus =
  | 'held'
  | 'escrow'
  | 'released'
  | 'refunded';

export type ProfileRole = 'customer' | 'driver' | 'business' | 'admin';

export type DriverProfileStatus =
  | 'pending'
  | 'approved'
  | 'suspended'
  | 'rejected';

export type ApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'expired';

export type DriverPlanId =
  | 'free'
  | 'basic'
  | 'pro_mini'
  | 'pro'
  | 'unlimited';

export type DocumentVerificationStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export type WalletTransactionType =
  | 'escrow_release'
  | 'refund_reversal'
  | 'subscription_credit'
  | 'payout';

/* ─── bookings ─────────────────────────────────────────────────── */

export interface BookingRow {
  id:                  UUID;
  customer_id:         UUID;
  customer_email:      string | null;
  customer_name:       string | null;
  customer_phone:      string | null;
  driver_id:           UUID | null;

  pickup_address:      string | null;
  pickup_postcode:     string | null;
  pickup_city:         string | null;
  pickup_lat:          number | null;
  pickup_lng:          number | null;

  dropoff_address:     string | null;
  dropoff_postcode:    string | null;
  dropoff_city:        string | null;
  dropoff_lat:         number | null;
  dropoff_lng:         number | null;

  move_type:           string | null;
  van_type:            string | null;
  helpers:             number | null;
  additional_services: string[] | null;
  items:               JsonObject | null;

  move_date:           DateString | null;
  move_time:           string | null;
  customer_notes:      string | null;

  status:              BookingStatus | string;
  payment_status:      PaymentStatus | string | null;

  distance_km:         number | null;
  estimated_hours:     number | null;
  actual_hours:        number | null;
  start_time:          Timestamptz | null;
  end_time:            Timestamptz | null;

  price_estimate:      number | null;
  original_price:      number | null;
  final_price:         number | null;
  price_adjusted:      boolean | null;
  manual_refund_percent: number | null;

  customer_confirmation: boolean | null;
  driver_confirmation:   boolean | null;

  /* Optional realtime fields written by the driver beacon. Read by
   * TrackingPage to seed the live map; tolerable as null when no
   * position has been captured yet. */
  driver_lat:          number | null;
  driver_lng:          number | null;

  created_at:          Timestamptz;
  updated_at:          Timestamptz | null;

  /* Optional invoice / alt-payment fields read by lib/bookingInvoice.
   * Typed as optional so callers that reference them compile while
   * the schema migration to make them non-null is staged. Remove the
   * `?` once the matching columns land in the bookings table. */
  vehicle_type?:       string | null;
  estimated_price?:    number | null;
  deposit_amount?:     number | null;
  cash_due_amount?:    number | null;
  contact_name?:       string | null;
  contact_email?:      string | null;
  contact_phone?:      string | null;
  from_address?:       string | null;
  to_address?:         string | null;
  scheduled_at?:       Timestamptz | null;
}

export interface BookingInsert
  extends Partial<Omit<BookingRow, 'id' | 'created_at' | 'updated_at'>> {
  customer_id:    UUID;
  pickup_address: string | null;
}

export type BookingUpdate = Partial<BookingRow>;

/* ─── escrow_payments ──────────────────────────────────────────── */

export interface EscrowRow {
  id:                  UUID;
  booking_id:          UUID;
  status:              EscrowStatus | string;
  amount:              number | null;
  original_amount:     number | null;
  driver_earning:      number | null;
  commission_amount:   number | null;
  final_price:         number | null;
  refund_amount:       number | null;

  /* Adjustment flow fields populated by process-payment::recalculate_price. */
  adjusted_amount:     number | null;
  adjustment_reason:   string | null;
  adjustment_required: boolean | null;
  adjustment_approved: boolean | null;

  released_at:         Timestamptz | null;
  created_at:          Timestamptz;
  updated_at:          Timestamptz | null;
}

export interface EscrowInsert
  extends Partial<Omit<EscrowRow, 'id' | 'created_at' | 'updated_at'>> {
  booking_id: UUID;
}

export type EscrowUpdate = Partial<EscrowRow>;

/* ─── profiles ─────────────────────────────────────────────────── */

export interface ProfileRow {
  id:         UUID;          // profiles.id (own PK)
  user_id:    UUID;          // FK → auth.users(id)
  email:      string | null;
  first_name: string | null;
  last_name:  string | null;
  phone:      string | null;
  avatar_url: string | null;
  role:       ProfileRole;
  created_at: Timestamptz;
}

export type ProfileUpdate = Partial<ProfileRow>;

/* ─── admin_accounts ───────────────────────────────────────────── */

export interface AdminAccountRow {
  id:         UUID;
  user_id:    UUID;
  created_at: Timestamptz;
}

/* ─── driver_profiles ──────────────────────────────────────────── */

export interface DriverProfileRow {
  id:                  UUID;
  user_id:             UUID;
  full_name:           string | null;
  phone:               string | null;
  status:              DriverProfileStatus | string;
  online:              boolean | null;
  is_busy:             boolean | null;
  availability_status: string | null;
  /** ISO-2 country / market code the driver operates in. Drives the
   *  country-aware subscription pricing in the driver portal. */
  zone:                string | null;
  /** City the driver primarily operates in. */
  city:                string | null;
  created_at:          Timestamptz;

  /* Joined ad-hoc by AdminDashboard via
   * `select('*, driver_subscriptions(plan)')`. */
  driver_subscriptions?: { plan: DriverPlanId | string }[];
}

export type DriverProfileUpdate = Partial<DriverProfileRow>;

export interface DriverProfileInsert
  extends Partial<Omit<DriverProfileRow, 'id' | 'created_at'>> {
  user_id: UUID;
}

/* ─── driver_applications ──────────────────────────────────────── */

export interface DriverApplicationRow {
  id:                UUID;
  user_id:           UUID;
  first_name:        string | null;
  last_name:         string | null;
  phone:             string | null;
  status:            ApplicationStatus | string;
  rejection_reason:  string | null;
  reviewed_by:       UUID | null;
  reviewed_at:       Timestamptz | null;
  created_at:        Timestamptz;
  /* Vehicle metadata. vehicle_model historically stored a
   * cram-string ("category · make model · compliance=JSON"); after
   * the install-application-compliance-columns.sql migration
   * applies, new rows store clean "{make} {model}" and the
   * structured columns below. The legacy parser in
   * src/lib/application-compliance.ts handles both formats. */
  vehicle_type?:        string | null;
  vehicle_model?:       string | null;
  vehicle_year?:        number | null;
  vehicle_registration?: string | null;
  /* Structured compliance columns (added by docs/install-
   * application-compliance-columns.sql). All optional + nullable
   * so the type works against both pre- and post-migration rows. */
  provider_category?:    string | null;
  usdot_number?:         string | null;
  mc_number?:            string | null;
  cargo_insurance?:      string | null;
  gvol_number?:          string | null;
  gukg_licence?:         string | null;
  yrkestransport?:       string | null;
  siret?:                string | null;
  tva?:                  string | null;
  ca_provincial_licence?: string | null;
  /* Customer email captured at apply time. */
  email?:                string | null;
  city?:                 string | null;
  zone?:                 string | null;
}

export type DriverApplicationUpdate = Partial<DriverApplicationRow>;

/* ─── driver_documents ─────────────────────────────────────────── */

export interface DriverDocumentRow {
  id:                  UUID;
  driver_id:           UUID;
  document_type:       string;
  file_url:            string;
  verification_status: DocumentVerificationStatus | string;
  uploaded_at:         Timestamptz;
  /** Expiry date for documents that expire (licenses, insurance,
   *  vehicle registrations). Nullable for non-expiring types. */
  expires_at?:         string | null;
}

/* ─── driver_subscriptions ─────────────────────────────────────── */

export interface DriverSubscriptionRow {
  id:                  UUID;
  driver_id:           UUID;
  plan:                DriverPlanId | string;
  plan_id:             string | null;
  subscription_status: SubscriptionStatus | string;
  status:              string | null;
  start_date:          Timestamptz | null;
  end_date:            Timestamptz | null;
  created_at:          Timestamptz;
}

export type DriverSubscriptionUpdate = Partial<DriverSubscriptionRow>;

export interface DriverSubscriptionInsert {
  driver_id:            UUID;
  plan:                 DriverPlanId | string;
  subscription_status?: SubscriptionStatus | string;
  start_date?:          Timestamptz | null;
  end_date?:            Timestamptz | null;
}

/* ─── driver_wallets ───────────────────────────────────────────── */

export interface DriverWalletRow {
  id:           UUID;
  driver_id:    UUID;
  balance:      number;
  pending:      number;
  total_earned: number;
  created_at:   Timestamptz;
  updated_at:   Timestamptz | null;
}

/* ─── driver_wallet_transactions ───────────────────────────────── */

export interface DriverWalletTransactionRow {
  id:          UUID;
  driver_id:   UUID;
  booking_id:  UUID | null;
  type:        WalletTransactionType | string;
  amount:      number;
  description: string | null;
  created_at:  Timestamptz;
}

export type DriverWalletTransactionInsert =
  Omit<DriverWalletTransactionRow, 'id' | 'created_at'>;

/* ─── payout_requests ──────────────────────────────────────────── */

export interface PayoutRequestRow {
  id:         UUID;
  driver_id:  UUID;
  amount:     number;
  status:     string | null;
  created_at: Timestamptz;
}

/* ─── booking_updates / dispatch_logs ──────────────────────────── */

export interface BookingUpdateRow {
  id:         UUID;
  booking_id: UUID;
  status:     string;
  created_at: Timestamptz;
}

export interface DispatchLogRow {
  id:         UUID;
  booking_id: UUID;
  driver_id:  UUID | null;
  response:   string | null;
  created_at: Timestamptz;
}

/* ─── platform_config ──────────────────────────────────────────── */

export interface PlatformConfigRow {
  id:           UUID;
  config_key:   string;
  config_value: string;
}

/* ─── commission_ledger / subscription_payments ────────────────── */

export interface CommissionLedgerRow {
  id:                UUID;
  commission_amount: number;
  created_at:        Timestamptz;
}

export interface SubscriptionPaymentRow {
  id:         UUID;
  amount:     number;
  created_at: Timestamptz;
}

/* ─── driver_locations ─────────────────────────────────────────── */

export interface DriverLocationRow {
  driver_id:  UUID;
  lat:        number;
  lng:        number;
  heading:    number | null;
  speed:      number | null;
  updated_at: Timestamptz;
}

/* ─── Supabase-compatible Database namespace ───────────────────── *
 *
 * Mirrors the shape supabase-js consumers expect from generated types
 * (`Tables<'name'>['Row']` etc.), so the typed client ergonomics
 * "just work" once the createClient call is generic-parameterised.
 * Today our client is plain (untyped); we use these aliases manually
 * via the per-table exports above. Wire `createClient<Database>(...)`
 * once we want compile-time safety on every supabase.from() call.
 */
export interface Database {
  public: {
    Tables: {
      bookings:                   { Row: BookingRow;                 Insert: BookingInsert;                 Update: BookingUpdate                };
      escrow_payments:            { Row: EscrowRow;                  Insert: EscrowInsert;                  Update: EscrowUpdate                 };
      profiles:                   { Row: ProfileRow;                 Insert: Partial<ProfileRow>;           Update: ProfileUpdate                };
      admin_accounts:             { Row: AdminAccountRow;            Insert: Partial<AdminAccountRow>;      Update: Partial<AdminAccountRow>     };
      driver_profiles:            { Row: DriverProfileRow;           Insert: DriverProfileInsert;           Update: DriverProfileUpdate          };
      driver_applications:        { Row: DriverApplicationRow;       Insert: Partial<DriverApplicationRow>; Update: DriverApplicationUpdate      };
      driver_documents:           { Row: DriverDocumentRow;          Insert: Partial<DriverDocumentRow>;    Update: Partial<DriverDocumentRow>   };
      driver_subscriptions:       { Row: DriverSubscriptionRow;      Insert: DriverSubscriptionInsert;      Update: DriverSubscriptionUpdate     };
      driver_wallets:             { Row: DriverWalletRow;            Insert: Partial<DriverWalletRow>;      Update: Partial<DriverWalletRow>     };
      driver_wallet_transactions: { Row: DriverWalletTransactionRow; Insert: DriverWalletTransactionInsert; Update: Partial<DriverWalletTransactionRow> };
      payout_requests:            { Row: PayoutRequestRow;           Insert: Partial<PayoutRequestRow>;     Update: Partial<PayoutRequestRow>    };
      booking_updates:            { Row: BookingUpdateRow;           Insert: Partial<BookingUpdateRow>;     Update: Partial<BookingUpdateRow>    };
      dispatch_logs:              { Row: DispatchLogRow;             Insert: Partial<DispatchLogRow>;       Update: Partial<DispatchLogRow>      };
      platform_config:            { Row: PlatformConfigRow;          Insert: Partial<PlatformConfigRow>;    Update: Partial<PlatformConfigRow>   };
      commission_ledger:          { Row: CommissionLedgerRow;        Insert: Partial<CommissionLedgerRow>;  Update: Partial<CommissionLedgerRow> };
      subscription_payments:      { Row: SubscriptionPaymentRow;     Insert: Partial<SubscriptionPaymentRow>; Update: Partial<SubscriptionPaymentRow> };
      driver_locations:           { Row: DriverLocationRow;          Insert: Partial<DriverLocationRow>;    Update: Partial<DriverLocationRow>   };
    };
  };
}

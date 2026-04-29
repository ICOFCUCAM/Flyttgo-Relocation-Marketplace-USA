-- ============================================================================
-- FlyttGo — widen provider_reputation.verification_level CHECK to 1..7
-- ============================================================================
-- Migration 00011 (identity-trust-layer) was authored to widen this CHECK
-- constraint, but at that point public.provider_reputation didn't exist
-- yet (it's created by 00016 dispute-completion, then extended with the
-- verification_level column by 00021 provider-scoring with CHECK 1..4).
-- 00011's section 2 now early-returns when the table is absent, so the
-- widening never lands in the natural ordering — apply it here, after all
-- prerequisites are in place.
--
-- Trust levels:
--   1 Registered User
--   2 Verified User
--   3 Verified Business
--   4 Verified Carrier
--   5 Certified Infrastructure Partner
--   6 Institutional Account
--   7 Government Account
-- ============================================================================

DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'provider_reputation'
       AND column_name  = 'verification_level'
  ) THEN
    RETURN;
  END IF;

  SELECT conname INTO v_constraint
    FROM pg_constraint
   WHERE conrelid = 'public.provider_reputation'::regclass
     AND pg_get_constraintdef(oid) ILIKE '%verification_level%';
  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.provider_reputation DROP CONSTRAINT %I', v_constraint);
  END IF;

  EXECUTE 'ALTER TABLE public.provider_reputation
             ADD CONSTRAINT provider_reputation_verification_level_check
             CHECK (verification_level BETWEEN 1 AND 7)';

  EXECUTE $cmt$
    COMMENT ON COLUMN public.provider_reputation.verification_level IS
      '1 Registered User · 2 Verified User · 3 Verified Business · 4 Verified Carrier · 5 Certified Infrastructure Partner · 6 Institutional Account · 7 Government Account'
  $cmt$;
END $$;

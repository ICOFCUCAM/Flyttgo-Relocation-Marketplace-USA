-- ============================================================================
-- FlyttGo — Refresh provider scoring on dispute creation
-- ============================================================================
-- Closes the last gap from the rating + reliability scoring spec:
-- the score must refresh when a dispute is *created*, not only when
-- it's resolved. PR #52 wired the resolution path; PR #54 wired
-- booking-status flips + activity decay; this PR wires the third
-- event the spec calls out — dispute creation.
--
-- The existing dispute_apply_escrow_hold trigger fires on
-- INSERT/UPDATE of disputes. We add a sibling trigger that fires
-- only on INSERT and refreshes the provider's score so the
-- provisional dispute (still 'open' / 'under_review') already
-- nudges the provider's rank downwards via the dispute_count input
-- of compute_provider_rank_score(). When the dispute later resolves,
-- the existing dispute_resolutions trigger refreshes again so the
-- final outcome is reflected.
--
-- Run AFTER:
--   - docs/install-disputes.sql
--   - docs/install-dispute-completion.sql
--   - docs/install-provider-scoring.sql
--   - docs/install-scoring-completion.sql
-- Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.disputes_refresh_provider_scoring_on_create()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.provider_user_id IS NOT NULL THEN
    PERFORM public.refresh_provider_scoring(NEW.provider_user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS disputes_refresh_provider_scoring_on_create_trigger
  ON public.disputes;

CREATE TRIGGER disputes_refresh_provider_scoring_on_create_trigger
  AFTER INSERT ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.disputes_refresh_provider_scoring_on_create();

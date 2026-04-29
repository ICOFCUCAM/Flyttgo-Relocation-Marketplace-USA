-- ============================================================================
-- FlyttGo — CIP enterprise routing + tier-aware ranking
-- ============================================================================
-- Closes the last spec gap: enterprise / institutional / government
-- relocation clients should see Certified Infrastructure Partners
-- *first* in search results — ahead of Gold Pro, then the rest.
--
-- The existing provider_city_rankings view (PR #53) sorts by
-- rank_score only. This migration adds:
--
--   provider_enterprise_rankings — joins provider_reputation with
--                                   the active driver_subscriptions
--                                   row + subscription_tiers position,
--                                   so callers can sort by
--                                   (tier_position DESC, rank_score DESC)
--                                   in one query.
--
--   subscription_tiers row update — ensures Elite (CIP) carries the
--                                    'municipal-relocation-access'
--                                    privilege the spec calls out.
--
-- Run AFTER:
--   - docs/install-pricing-engine.sql
--   - docs/install-disputes.sql + install-dispute-completion.sql
--   - docs/install-provider-scoring.sql + install-scoring-completion.sql
--   - docs/install-subscription-tier-pricing.sql
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Add municipal-relocation-access to the CIP tier privileges
-- ----------------------------------------------------------------------------
-- array_append is idempotent only if we guard the membership.
UPDATE public.subscription_tiers
   SET privileges = array_append(privileges, 'municipal-relocation-access'),
       updated_at = now()
 WHERE slug = 'elite'
   AND NOT ('municipal-relocation-access' = ANY(privileges));


-- ----------------------------------------------------------------------------
-- 2. provider_enterprise_rankings — tier-aware sort for institutional clients
-- ----------------------------------------------------------------------------
-- Surfaces every active provider with their tier position so a
-- corporate / university / municipal / government booking can sort
-- providers by:
--
--     ORDER BY tier_position DESC,    -- CIP first, Gold Pro next, …
--              rank_score    DESC NULLS LAST
--
-- Tier_position comes from subscription_tiers.position (CIP=50,
-- Gold Pro=40, Gold=30, Silver Plus=20, Silver=10) so providers
-- who haven't subscribed land at 0 — naturally last.
--
-- Joined to driver_subscriptions so we look at the *active* plan
-- (status='active'), not stale rows.

CREATE OR REPLACE VIEW public.provider_enterprise_rankings AS
SELECT
  pr.user_id,
  pr.rank_score,
  pr.avg_rating,
  pr.rating_count,
  pr.completion_rate,
  pr.on_time_rate,
  pr.verification_level,
  pr.is_top_rated,
  pr.is_suspended,
  pr.trust_badges,
  /* Active subscription tier slug + position. NULL when the
   * provider has no active subscription. */
  ds.plan                      AS tier_slug,
  st.display_name              AS tier_name,
  COALESCE(st.position, 0)     AS tier_position,
  st.privileges                AS tier_privileges,
  /* Convenience flag — true iff this provider is a CIP. */
  (ds.plan = 'elite')          AS is_certified_infrastructure_partner
FROM public.provider_reputation pr
LEFT JOIN public.driver_subscriptions ds
       ON ds.driver_id = pr.user_id
      AND ds.subscription_status = 'active'
LEFT JOIN public.subscription_tiers st
       ON st.slug = ds.plan
WHERE pr.is_suspended = false;

COMMENT ON VIEW public.provider_enterprise_rankings IS
  'Tier-aware provider ranking for enterprise / institutional / government search. Sort by (tier_position DESC, rank_score DESC). CIPs (tier_position=50) surface first; unsubscribed providers (tier_position=0) last.';


-- ----------------------------------------------------------------------------
-- 3. Helper — find providers eligible for a specific institutional segment
-- ----------------------------------------------------------------------------
-- Convenience function the booking flow / corporate dashboard can
-- call. Returns providers in tier-then-rank order, filtered to those
-- whose tier privileges include the requested segment.
--
--   p_segment values: 'corporate' | 'enterprise' | 'university'
--                     | 'municipal' | 'government'
--
-- Maps the segment to the matching privilege slug and filters.
CREATE OR REPLACE FUNCTION public.find_eligible_providers_for_segment(
  p_segment  TEXT,
  p_limit    INTEGER DEFAULT 20
) RETURNS TABLE (
  user_id      UUID,
  rank_score   SMALLINT,
  tier_slug    TEXT,
  tier_name    TEXT,
  is_cip       BOOLEAN
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_required_privilege TEXT;
BEGIN
  v_required_privilege := CASE p_segment
    WHEN 'corporate'  THEN 'corporate-relocation-access'
    WHEN 'enterprise' THEN 'enterprise-relocation-access'
    WHEN 'university' THEN 'university-relocation-access'
    WHEN 'municipal'  THEN 'municipal-relocation-access'
    WHEN 'government' THEN 'government-deployment-access'
    ELSE NULL
  END;

  IF v_required_privilege IS NULL THEN
    RAISE EXCEPTION 'unknown_segment: %', p_segment;
  END IF;

  RETURN QUERY
  SELECT per.user_id,
         per.rank_score,
         per.tier_slug,
         per.tier_name,
         per.is_certified_infrastructure_partner AS is_cip
  FROM public.provider_enterprise_rankings per
  WHERE v_required_privilege = ANY(per.tier_privileges)
  ORDER BY per.tier_position DESC,
           per.rank_score    DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

GRANT SELECT  ON public.provider_enterprise_rankings                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_eligible_providers_for_segment(TEXT, INTEGER) TO anon, authenticated;

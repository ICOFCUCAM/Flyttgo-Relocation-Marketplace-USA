import React, { useEffect, useState } from 'react';
import {
  Trophy, Zap, ShieldCheck, BadgeCheck, Sparkles, Building2,
  GraduationCap, Landmark, type LucideIcon,
} from 'lucide-react';
import {
  loadProviderScore, deriveTrustBadges,
  type TrustBadgeSlug, type ProviderScoreRow,
} from '../../lib/provider-scoring-store';

/* ─────────────────────────────────────────────────────────────────
 * <TrustBadges> — provider trust-badge cluster.
 *
 * Reads provider_reputation by user_id, derives the active badge
 * set (verification level + score thresholds + admin-granted
 * badges), and renders a tight cluster of pills.
 *
 * Two modes:
 *   - userId: fetches the score row from Supabase
 *   - score:  pass a pre-fetched row to skip the network round-trip
 *             (use when rendering a list of providers)
 *
 * Self-suppresses when no row exists yet — the marketplace doesn't
 * want a half-rendered badge cluster on a fresh provider.
 * ───────────────────────────────────────────────────────────────── */

const BADGE_DEF: Record<TrustBadgeSlug, { label: string; icon: LucideIcon; tone: string }> = {
  'top-rated':           { label: 'Top Rated',                icon: Trophy,      tone: 'bg-amber-50 text-amber-700' },
  'fast-response':       { label: 'Fast Response',            icon: Zap,         tone: 'bg-cyan-50  text-cyan-700' },
  'verified-carrier':    { label: 'Verified Carrier',         icon: BadgeCheck,  tone: 'bg-emerald-50 text-emerald-700' },
  'verified-provider':   { label: 'Verified Provider',        icon: ShieldCheck, tone: 'bg-trust-50 text-trust-600' },
  'registered-provider': { label: 'Registered Provider',      icon: ShieldCheck, tone: 'bg-slate-100 text-slate-600' },
  'new-provider':        { label: 'New on FlyttGo',           icon: Sparkles,    tone: 'bg-violet-50 text-violet-700' },
  'corporate-ready':     { label: 'Corporate Relocation Ready', icon: Building2, tone: 'bg-indigo-50 text-indigo-700' },
  'university-ready':    { label: 'University Relocation Ready', icon: GraduationCap, tone: 'bg-blue-50 text-blue-700' },
  'government-ready':    { label: 'Government Deployment Ready', icon: Landmark, tone: 'bg-rose-50 text-rose-700' },
};

interface Props {
  userId?:   string;
  score?:    ProviderScoreRow;
  /** Compact = icon-only chips. */
  compact?:  boolean;
  /** Cap rendering to N badges to keep the cluster tidy. */
  max?:      number;
  className?: string;
}

export default function TrustBadges({ userId, score, compact = false, max = 4, className = '' }: Props) {
  const [resolved, setResolved] = useState<ProviderScoreRow | null | 'loading'>(
    score ?? (userId ? 'loading' : null),
  );

  useEffect(() => {
    if (score || !userId) return;
    let cancelled = false;
    loadProviderScore(userId)
      .then(r => { if (!cancelled) setResolved(r); })
      .catch(() => { if (!cancelled) setResolved(null); });
    return () => { cancelled = true; };
  }, [userId, score]);

  if (resolved === 'loading' || resolved === null) return null;

  const badges = deriveTrustBadges(resolved).slice(0, max);
  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {badges.map(slug => {
        const def  = BADGE_DEF[slug];
        const Icon = def.icon;
        if (compact) {
          return (
            <span
              key={slug}
              title={def.label}
              className={`inline-flex items-center justify-center w-5 h-5 rounded-md ${def.tone}`}
            >
              <Icon size={11} />
            </span>
          );
        }
        return (
          <span
            key={slug}
            className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5 text-[10px] ${def.tone}`}
          >
            <Icon size={10} />
            {def.label}
          </span>
        );
      })}
    </div>
  );
}

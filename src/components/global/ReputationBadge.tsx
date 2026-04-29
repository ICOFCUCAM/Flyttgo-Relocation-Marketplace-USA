import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, type LucideIcon } from 'lucide-react';
import {
  loadProviderReputation, reputationTier,
  type ProviderReputationRow,
} from '../../lib/admin-disputes-store';

/* ─────────────────────────────────────────────────────────────────
 * <ReputationBadge> — provider reliability score badge.
 *
 * Reads provider_reputation by userId and renders the band:
 *   95+ → Elite     (emerald)
 *   80+ → Strong    (brand)
 *   60+ → Fair      (amber)
 *   <60 → Watchlist (rose)
 *
 * Self-suppresses when no row exists yet (provider hasn't accrued
 * any disputes — a fresh-onboarded provider in good standing).
 *
 * Drop-in for any provider-facing surface that has a real Supabase
 * user_id. The curated PROVIDERS catalogue doesn't yet — wire this
 * up once the providers table moves to Supabase.
 * ───────────────────────────────────────────────────────────────── */

const TIER_TONE: Record<ReturnType<typeof reputationTier>, { bg: string; text: string; icon: LucideIcon; label: string }> = {
  elite:     { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: ShieldCheck, label: 'Elite reliability' },
  strong:    { bg: 'bg-brand-50',   text: 'text-brand-700',   icon: ShieldCheck, label: 'Strong reliability' },
  fair:      { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: ShieldAlert, label: 'Fair reliability' },
  watchlist: { bg: 'bg-rose-50',    text: 'text-rose-700',    icon: AlertTriangle, label: 'Watchlist · review' },
};

interface Props {
  userId:    string;
  /** Compact = icon + score only; full = icon + label + score. */
  compact?:  boolean;
  className?: string;
}

export default function ReputationBadge({ userId, compact = false, className = '' }: Props) {
  const [row, setRow] = useState<ProviderReputationRow | null | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;
    loadProviderReputation(userId)
      .then(r => { if (!cancelled) setRow(r); })
      .catch(() => { if (!cancelled) setRow(null); });
    return () => { cancelled = true; };
  }, [userId]);

  /* Hide while loading + when no row exists. The absence of a row
   * means the provider has zero recorded disputes — assumed "good
   * standing" until proven otherwise. */
  if (row === 'loading' || row === null) return null;

  /* Suspended overrides every tier — block bookings UI from above
   * via the is_suspended flag. */
  if (row.is_suspended) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-md px-2 py-1 text-[10px] bg-rose-100 text-rose-800 ${className}`}>
        <AlertTriangle size={11} /> Suspended
      </span>
    );
  }

  const tier = reputationTier(row.reliability_score);
  const tone = TIER_TONE[tier];
  const Icon = tone.icon;

  if (compact) {
    return (
      <span
        title={`${tone.label} · ${row.dispute_count} dispute${row.dispute_count === 1 ? '' : 's'} on record`}
        className={`inline-flex items-center gap-1 font-bold rounded-md px-1.5 py-0.5 text-[10px] ${tone.bg} ${tone.text} ${className}`}
      >
        <Icon size={10} />
        {row.reliability_score}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-md px-2 py-1 text-[10px] ${tone.bg} ${tone.text} ${className}`}
      title={`${row.dispute_count} dispute${row.dispute_count === 1 ? '' : 's'} on record · ${row.dispute_loss_count} resolved against`}
    >
      <Icon size={11} />
      {tone.label} · {row.reliability_score}
    </span>
  );
}

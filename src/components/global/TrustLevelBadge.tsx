import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import { TRUST_LEVEL_LABEL, TRUST_LEVEL_TONE } from '../../lib/identity-store';

/* ─────────────────────────────────────────────────────────────────
 * <TrustLevelBadge>
 *
 * Compact pill rendering the user's resolved Identity & Trust
 * level (1-7). Pairs with `compute_trust_level(user_id)` server-
 * side — the same value the matcher uses for routing eligibility.
 *
 * Two variants:
 *   compact (default) — single-line pill for cards / lists
 *   full              — pill + subtitle for profile heroes
 * ───────────────────────────────────────────────────────────────── */

interface Props {
  level:    number;        // 1-7
  variant?: 'compact' | 'full';
  className?: string;
}

export default function TrustLevelBadge({ level, variant = 'compact', className = '' }: Props) {
  const safe = Math.min(7, Math.max(1, Math.round(level)));
  const tone = TRUST_LEVEL_TONE[safe];
  const label = TRUST_LEVEL_LABEL[safe];
  const Icon = safe >= 4 ? ShieldCheck : Lock;

  if (variant === 'full') {
    return (
      <div className={`inline-flex items-start gap-2 ${className}`}>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tone.bg} ${tone.text}`}>
          <Icon size={12} />
          Level {safe}
        </span>
        <div>
          <p className={`text-sm font-bold ${tone.text}`}>{label}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">
            Trust score · {safe}/7
          </p>
        </div>
      </div>
    );
  }

  return (
    <span
      title={`${label} · Trust level ${safe}/7`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${tone.bg} ${tone.text} ${className}`}
    >
      <Icon size={10} />
      L{safe} · {label}
    </span>
  );
}

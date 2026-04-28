import React from 'react';
import { type LucideIcon } from 'lucide-react';

/**
 * <StatBlock> — labelled metric card used on the home stats strip,
 * country pages, and admin / driver dashboards. Pairs an icon, a
 * formatted value, and a label. The value should be pre-formatted
 * (e.g. "$50k", "27,000+", "<60s") so callers can cap precision
 * how they like.
 *
 * For numbers that should animate, swap `value` for the AnimatedNumber
 * primitive in src/components/ds/AnimatedNumber.tsx.
 */
export default function StatBlock({
  icon: Icon,
  value,
  label,
  tone = 'ink',
}: {
  icon?: LucideIcon;
  value: React.ReactNode;
  label: string;
  /** ink = navy/white card · brand = amber-tinted · canvas = white card */
  tone?: 'ink' | 'brand' | 'canvas';
}) {
  const toneClass =
    tone === 'brand'  ? 'bg-brand-50      border-brand-400/40    text-ink-900' :
    tone === 'canvas' ? 'bg-surface-canvas border-slate-200      text-ink-900' :
                        'bg-white/5        border-white/10       text-white';
  const iconClass =
    tone === 'brand'  ? 'bg-brand-500/15 text-brand-600' :
    tone === 'canvas' ? 'bg-brand-50    text-brand-600' :
                        'bg-brand-400/20 text-brand-400';
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${toneClass}`}>
      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
          <Icon size={20} />
        </div>
      )}
      <div>
        <p className="text-2xl sm:text-3xl font-extrabold leading-none">{value}</p>
        <p className={`text-xs sm:text-sm mt-1 ${tone === 'ink' ? 'text-white/70' : 'text-slate-500'}`}>
          {label}
        </p>
      </div>
    </div>
  );
}

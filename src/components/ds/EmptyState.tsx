import React from 'react';
import { type LucideIcon } from 'lucide-react';

/**
 * <EmptyState> — generic empty / zero-state primitive used on
 * MyBookings, CustomerDashboard, AdminDashboard search, and the
 * NotFoundPage. Pairs an illustration / icon with a heading, body
 * copy, and one or two CTAs.
 *
 * Tone:
 *   - 'soft'   (default): warm-white card with brand accent
 *   - 'inline' borderless block for nesting inside existing cards
 *   - 'error'  red-tinted variant for failure surfaces
 */
export default function EmptyState({
  icon: Icon,
  illustration,
  title,
  body,
  primaryAction,
  secondaryAction,
  tone = 'soft',
  className = '',
}: {
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  primaryAction?:   { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  tone?: 'soft' | 'inline' | 'error';
  className?: string;
}) {
  const wrapperClass =
    tone === 'inline'
      ? 'py-10'
      : tone === 'error'
      ? 'bg-danger-50 border border-danger-600/20 rounded-2xl p-8 sm:p-12'
      : 'bg-surface-soft border border-slate-200 rounded-2xl p-8 sm:p-12';
  const iconWrapClass =
    tone === 'error'
      ? 'bg-danger-50 text-danger-600 ring-4 ring-danger-600/10'
      : 'bg-brand-50 text-brand-600 ring-4 ring-brand-500/10';

  return (
    <div className={`text-center max-w-md mx-auto ${wrapperClass} ${className}`}>
      {illustration ? (
        <div className="mb-5 flex justify-center">{illustration}</div>
      ) : Icon ? (
        <div className={`w-14 h-14 mx-auto rounded-2xl ${iconWrapClass} flex items-center justify-center mb-5`}>
          <Icon size={26} />
        </div>
      ) : null}
      <h3 className="text-xl font-bold text-ink-900 mb-2">{title}</h3>
      {body && <div className="text-sm text-slate-600 leading-relaxed">{body}</div>}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-ink-900 font-bold rounded-xl text-sm shadow-soft transition-base ease-marketplace"
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-5 py-2.5 border border-slate-300 hover:border-ink-900 text-slate-700 hover:text-ink-900 font-bold rounded-xl text-sm transition-base ease-marketplace"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

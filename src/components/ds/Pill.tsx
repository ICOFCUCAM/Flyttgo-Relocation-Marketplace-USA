import React from 'react';

/**
 * <Pill> — small inline label / badge / verification chip. Used for
 * the "Verified", "Most popular", "Live" markers across the
 * marketplace. Tone maps to the semantic palette in design tokens.
 */
export default function Pill({
  tone = 'brand',
  size = 'md',
  className = '',
  children,
}: {
  tone?: 'brand' | 'trust' | 'ink' | 'danger' | 'soft';
  size?: 'sm' | 'md';
  className?: string;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'trust'  ? 'bg-trust-50    text-trust-600'   :
    tone === 'danger' ? 'bg-danger-50   text-danger-600'  :
    tone === 'ink'    ? 'bg-ink-900     text-white'       :
    tone === 'soft'   ? 'bg-slate-100   text-slate-700'   :
                        'bg-brand-50    text-brand-600';
  const sizeClass = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-md ${toneClass} ${sizeClass} ${className}`}
    >
      {children}
    </span>
  );
}

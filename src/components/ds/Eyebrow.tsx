import React from 'react';

/**
 * <Eyebrow> — the small uppercase tag-line that sits above a section
 * heading. Centralises the typography choice (xs / bold / wide
 * tracking) so every section reads at the same rhythm.
 */
export default function Eyebrow({
  children,
  tone = 'brand',
  className = '',
}: {
  children: React.ReactNode;
  /** brand=amber-700, ink=slate-500, mono=slate-400 monospace */
  tone?: 'brand' | 'ink' | 'mono';
  className?: string;
}) {
  const toneClass =
    tone === 'mono'
      ? 'font-mono text-slate-500'
      : tone === 'ink'
      ? 'text-slate-500'
      : 'text-brand-600';
  return (
    <p className={`text-xs font-bold uppercase tracking-[0.18em] mb-2 ${toneClass} ${className}`}>
      {children}
    </p>
  );
}

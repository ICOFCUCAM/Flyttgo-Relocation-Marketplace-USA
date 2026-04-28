import React from 'react';

/**
 * <SectionHeading> — the large section H2/H3. Ladder:
 *
 *   xl:  text-3xl sm:text-4xl lg:text-5xl   (default)
 *   lg:  text-3xl sm:text-4xl                (sub-section)
 *   sm:  text-2xl                            (compact)
 *
 * Pass `as` to render an h1 / h2 / h3 — the visual size and the
 * semantic level are decoupled. Default tag is h2 because hero h1's
 * are usually inline in the page itself.
 */
export default function SectionHeading({
  as: Tag = 'h2',
  size = 'xl',
  className = '',
  children,
}: {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  size?: 'sm' | 'lg' | 'xl';
  className?: string;
  children: React.ReactNode;
}) {
  const sizeClass =
    size === 'xl' ? 'text-3xl sm:text-4xl lg:text-5xl'
  : size === 'lg' ? 'text-3xl sm:text-4xl'
                  : 'text-2xl';
  return (
    <Tag className={`${sizeClass} font-extrabold tracking-tight leading-[1.05] ${className}`}>
      {children}
    </Tag>
  );
}

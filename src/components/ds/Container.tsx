import React from 'react';

/**
 * <Container> — single source of truth for the marketplace's content
 * width + horizontal padding. Replaces the
 *   `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
 * pattern repeated ~25× across the codebase. Wraps the children in a
 * `max-w-[var(--space-container-max)]` block (1280px by default) with
 * the responsive horizontal padding scale defined in design tokens.
 */
export default function Container({
  as: Tag = 'div',
  className = '',
  children,
  size = 'default',
}: {
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children: React.ReactNode;
  /** narrow ≈ 768px (legal/long-form), default ≈ 1280px, wide = full hero. */
  size?: 'narrow' | 'default' | 'wide';
}) {
  const widthClass =
    size === 'narrow' ? 'max-w-3xl' :
    size === 'wide'   ? 'max-w-[88rem]' :
                        'max-w-7xl';
  return (
    <Tag className={`${widthClass} mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </Tag>
  );
}

import React from 'react';
import Container from './Container';

type Tone =
  | 'canvas'    // pure white
  | 'soft'      // warm-white #fafaf7
  | 'warm'      // pale amber tint
  | 'ink'       // dark navy, light text
  | 'brand';    // amber gradient

const TONE_CLASS: Record<Tone, string> = {
  canvas: 'bg-surface-canvas text-ink-900',
  soft:   'bg-surface-soft   text-ink-900',
  warm:   'bg-surface-warm   text-ink-900',
  ink:    'bg-ink-900        text-white',
  brand:  'bg-gradient-to-br from-brand-400 to-brand-500 text-ink-900',
};

/**
 * <Section> — vertical-rhythm + tone wrapper. Pairs with <Container>
 * to remove the `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20`
 * pattern. Pass `tone` for the section background; the right text
 * color is applied automatically.
 *
 * <Section tone="soft">
 *   <Eyebrow>Why FlyttGo</Eyebrow>
 *   <SectionHeading>Built around four promises.</SectionHeading>
 *   …
 * </Section>
 */
export default function Section({
  tone        = 'canvas',
  size        = 'default',
  containerSize = 'default',
  bordered    = false,
  className   = '',
  children,
  id,
}: {
  tone?: Tone;
  /** Vertical padding scale — sm/default/lg. */
  size?: 'sm' | 'default' | 'lg';
  /** Inner container width — narrow/default/wide. */
  containerSize?: 'narrow' | 'default' | 'wide';
  /** Adds a single-pixel bottom border. */
  bordered?: boolean;
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const padding =
    size === 'sm'  ? 'py-12 sm:py-14'
  : size === 'lg'  ? 'py-20 sm:py-24 lg:py-28'
                   : 'py-16 sm:py-20';
  const border = bordered ? 'border-b border-slate-200' : '';
  return (
    <section id={id} className={`${TONE_CLASS[tone]} ${padding} ${border} ${className}`}>
      <Container size={containerSize}>{children}</Container>
    </section>
  );
}

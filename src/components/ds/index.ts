/**
 * FlyttGo design-system primitives. Re-export from one barrel so
 * consumers can import the way they expect:
 *
 *   import { Section, Container, Eyebrow, SectionHeading, Pill, StatBlock } from '@/components/ds';
 *
 * Tokens themselves live in src/index.css (:root vars) and
 * tailwind.config.ts (theme.extend). Update both in lockstep when a
 * new token is added.
 */
export { default as Container }      from './Container';
export { default as Section }        from './Section';
export { default as Eyebrow }        from './Eyebrow';
export { default as SectionHeading } from './SectionHeading';
export { default as StatBlock }      from './StatBlock';
export { default as Pill }           from './Pill';
export { default as AnimatedNumber } from './AnimatedNumber';

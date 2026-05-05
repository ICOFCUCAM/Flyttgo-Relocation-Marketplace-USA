/**
 * Shared interaction tokens for the FlyttGo design system.
 *
 * Lives in TypeScript (rather than a Tailwind plugin) so any
 * component can import the canonical class string and stay in sync
 * without a global stylesheet edit. Tokens compose with the
 * component's own className via `clsx`/template literals.
 *
 * Why this exists: focus rings, motion timing, and pressed states
 * were drifting across the codebase — some components used
 * `focus-visible:ring-2`, some `focus:ring`, some omitted offsets,
 * and a few buttons had no visible focus state at all. Centralising
 * the strings means a future tweak to brand-amber or to the offset
 * happens in one place.
 *
 * No runtime, no React — just constants. Tree-shakes to nothing in
 * components that don't import these.
 */

/** Brand-coloured focus ring for keyboard navigation. Apply on
 *  every interactive element (button, anchor, link-styled div).
 *  The ring sits one pixel off the element so it doesn't crowd the
 *  border on tightly-packed cards. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2';

/** Subtle press feedback for primary CTAs — translates 1px on
 *  active so the click registers physically without a colour shift
 *  that would conflict with the brand amber. */
export const PRESS_FEEDBACK =
  'active:translate-y-[1px] transition-transform duration-75';

/** Standard motion timing — 200ms is the platform default for
 *  hover transitions; 75ms for press; 500ms for image scale. Use
 *  these directly in transition utilities instead of inventing
 *  new durations per component. */
export const MOTION = {
  hover:    'transition duration-200',
  press:    'transition duration-75',
  reveal:   'transition duration-500',
} as const;

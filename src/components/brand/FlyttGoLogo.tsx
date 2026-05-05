/* ─────────────────────────────────────────────────────────────────
 * <FlyttGoLogo>
 *
 * The single source of truth for the FlyttGo brand mark across the
 * marketplace. Replaces the dozen hand-rolled `<img> + <span>FlyttGo`
 * blocks the codebase used to ship with so the wordmark spacing,
 * subtitle treatment, and alignment stay consistent everywhere.
 *
 * Composition:
 *   • F-mark        — public/logo-mark.png (raster, brand-issued)
 *                     Mono / inverse variants fall back to an inline
 *                     SVG so the mark can still recolour for dark
 *                     hero overlays.
 *   • Wordmark      — "FlyttGo" set in bold-italic system fonts
 *   • Subtitle      — optional small-caps tagline beneath the wordmark
 *
 * Layout: top-aligned (items-start). The wordmark's top edge lines up
 * with the mark's top edge, and the subtitle sits directly under the
 * wordmark in a tight vertical stack — no vertical centring weirdness
 * regardless of whether the subtitle is shown.
 *
 * Sizes (preset → mark px / wordmark text class):
 *   sm  → 24 / text-base
 *   md  → 36 / text-xl     (default)
 *   lg  → 56 / text-3xl
 *
 * Variants:
 *   color       — full-colour brand PNG + navy wordmark + amber "Go"
 *   on-dark     — same PNG + white wordmark + amber "Go" (dark surfaces)
 *   mono-dark   — drawn SVG in deep navy (light surfaces, no colour)
 *   mono-light  — drawn SVG in white (dark surfaces, no colour)
 *
 * Use sparingly: this is a navigation / footer / auth ornament. If
 * you need a 200px brand panel, use BrandPage's larger composition.
 * ──────────────────────────────────────────────────────────────── */

import type { CSSProperties } from 'react';

export type FlyttGoLogoSize    = 'sm' | 'md' | 'lg';
export type FlyttGoLogoVariant = 'color' | 'on-dark' | 'mono-dark' | 'mono-light';

interface SizePreset {
  /** F-mark side length in px. */
  mark:        number;
  /** Tailwind text class for the wordmark. */
  wordmark:    string;
  /** Tailwind text class for the optional subtitle. */
  subtitle:    string;
  /** Negative letter spacing on the wordmark. */
  tracking:    string;
  /** Gap between mark and wordmark column. */
  gap:         string;
}

const SIZE_PRESETS: Record<FlyttGoLogoSize, SizePreset> = {
  sm: { mark: 24, wordmark: 'text-base',  subtitle: 'text-[9px]',  tracking: 'tracking-tight',  gap: 'gap-1.5' },
  md: { mark: 36, wordmark: 'text-xl',    subtitle: 'text-[10px]', tracking: 'tracking-tight',  gap: 'gap-1.5' },
  lg: { mark: 56, wordmark: 'text-3xl',   subtitle: 'text-[11px]', tracking: 'tracking-tight',  gap: 'gap-2' },
};

interface VariantTokens {
  flytt:    string;       // Tailwind text colour for "Flytt"
  go:       string;       // Tailwind text colour for "Go"
  subtitle: string;       // Tailwind text colour for subtitle
}

const VARIANT_TOKENS: Record<FlyttGoLogoVariant, VariantTokens> = {
  color:      { flytt: 'text-slate-900', go: 'text-amber-600',  subtitle: 'text-slate-500' },
  'on-dark':  { flytt: 'text-white',     go: 'text-amber-300',  subtitle: 'text-white/60'  },
  'mono-dark':{ flytt: 'text-slate-900', go: 'text-slate-900',  subtitle: 'text-slate-500' },
  'mono-light':{flytt: 'text-white',     go: 'text-white',      subtitle: 'text-white/60'  },
};

export interface FlyttGoLogoProps {
  /** Preset size; controls mark px + font sizes together. Default 'md'. */
  size?:      FlyttGoLogoSize;
  /** Colour variant. Default 'color'. */
  variant?:   FlyttGoLogoVariant;
  /** Optional subtitle (e.g. "Global relocation marketplace"). */
  subtitle?:  string;
  /** Hide the wordmark, render just the mark. Useful for super-tight slots. */
  markOnly?:  boolean;
  /** Forwarded to the outer container so callers can add margins / hover styles. */
  className?: string;
  /** Override the aria label. Default 'FlyttGo'. */
  ariaLabel?: string;
}

export default function FlyttGoLogo({
  size      = 'md',
  variant   = 'color',
  subtitle,
  markOnly  = false,
  className = '',
  ariaLabel = 'FlyttGo',
}: FlyttGoLogoProps) {
  const preset = SIZE_PRESETS[size];
  const tokens = VARIANT_TOKENS[variant];

  /* The mark uses the brand-issued raster for the colour + on-dark
   * variants (matches the favicon + apple-touch-icon pixel-for-pixel)
   * and falls back to the inline SVG drawing for mono variants which
   * need to recolour cleanly. */
  const mark = (variant === 'color' || variant === 'on-dark')
    ? <RasterMark size={preset.mark} alt={ariaLabel} />
    : <DrawnMark  size={preset.mark} variant={variant} />;

  if (markOnly) return <span className={className}>{mark}</span>;

  return (
    <span
      role="img"
      aria-label={subtitle ? `${ariaLabel} — ${subtitle}` : ariaLabel}
      className={`inline-flex items-start ${preset.gap} ${className}`}
    >
      {mark}

      <span className="flex flex-col leading-none pt-0.5">
        <span className={`font-extrabold ${preset.tracking} ${preset.wordmark} ${tokens.flytt}`}>
          Flytt<span className={tokens.go}>Go</span>
        </span>
        {subtitle && (
          <span
            className={`uppercase font-semibold mt-1 ${preset.subtitle} ${tokens.subtitle}`}
            style={SUBTITLE_TRACKING}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}

/* Letter-spacing is too wide to express via a Tailwind class and stay
 * legible — set it inline. */
const SUBTITLE_TRACKING: CSSProperties = { letterSpacing: '0.18em' };

/* ── Raster mark (color + on-dark) ───────────────────────────
 *
 * The brand-issued PNG ships with ~12% whitespace baked into each
 * side. We render the img at 130% of the visible box and clip the
 * overflow so the F-mark fills the square edge-to-edge — the
 * wordmark beside it then sits flush against the actual mark, not
 * against transparent margin. */

function RasterMark({ size, alt }: { size: number; alt: string }) {
  const overscale = size * 1.3;
  const offset    = (size - overscale) / 2;
  return (
    <span
      className="relative inline-block flex-shrink-0 overflow-hidden rounded-lg"
      style={{ width: size, height: size }}
    >
      <img
        src="/logo-mark.png"
        alt={alt}
        decoding="async"
        style={{
          position: 'absolute',
          width:  overscale,
          height: overscale,
          left:   offset,
          top:    offset,
        }}
      />
    </span>
  );
}

/* ── Drawn mark (mono-dark / mono-light) ──────────────────────
 *
 * Italic block "F" + leaf accent, drawn so the mark can recolour to
 * a single brand ink. Used on dark hero overlays and other surfaces
 * where the raster's full-colour palette would clash. */
function DrawnMark({
  size, variant,
}: { size: number; variant: 'mono-dark' | 'mono-light' }) {
  const ink    = variant === 'mono-light' ? '#ffffff' : '#0b1f3a';
  const accent = ink;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
      aria-hidden
    >
      <g transform="skewX(-14) translate(8 0)">
        <path
          d="M 18 6 L 54 6 L 54 18 L 30 18 L 30 28 L 44 28 L 44 38 L 30 38 L 30 58 L 18 58 Z"
          fill={ink}
        />
      </g>
      <path
        d="M 4 60 C 4 44, 14 32, 26 30 C 28 36, 26 46, 20 53 C 16 57, 10 60, 4 60 Z"
        fill={accent}
      />
    </svg>
  );
}

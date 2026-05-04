/* ─────────────────────────────────────────────────────────────────
 * <FlyttGoLogo>
 *
 * Brand mark + wordmark, hand-drawn as SVG so it renders crisply at
 * any size without a font dependency. The F-mark is a slanted block
 * letter with an orange leaf accent nestled at its base; the
 * wordmark is bold-italic with "Flytt" in deep navy and "Go" in
 * brand amber.
 *
 * Variants:
 *   color       — full brand palette (default; navy + amber)
 *   mono-dark   — everything in deep navy (works on light surfaces)
 *   mono-light  — everything in white (works on dark surfaces)
 *   inverse     — white F + amber leaf + white "Flytt" + amber "Go"
 *                 (designed for the navy hero overlays)
 *
 * Composition flags:
 *   showMark      — render the F-mark (default true)
 *   showWordmark  — render the "FlyttGo" text (default true)
 *
 *   The two flags compose: <FlyttGoLogo showWordmark={false} /> renders
 *   just the F-mark (favicon-style), <FlyttGoLogo showMark={false} />
 *   renders just the wordmark (footer-style).
 *
 * Sizing is driven by the `size` prop (height in px) — width is
 * derived automatically from the chosen composition. Pass
 * `className` for layout positioning; the component never sets its
 * own margins.
 * ───────────────────────────────────────────────────────────────── */

export type FlyttGoLogoVariant = 'color' | 'mono-dark' | 'mono-light' | 'inverse';

interface Props {
  size?:          number;
  variant?:       FlyttGoLogoVariant;
  showMark?:      boolean;
  showWordmark?:  boolean;
  className?:     string;
  ariaLabel?:     string;
}

interface PaletteEntry {
  ink:     string;
  accent:  string;
  flytt:   string;
  go:      string;
}

const PALETTE: Record<FlyttGoLogoVariant, PaletteEntry> = {
  color:      { ink: '#0b1f3a', accent: '#d97706', flytt: '#0b1f3a', go: '#d97706' },
  'mono-dark':  { ink: '#0b1f3a', accent: '#0b1f3a', flytt: '#0b1f3a', go: '#0b1f3a' },
  'mono-light': { ink: '#ffffff', accent: '#ffffff', flytt: '#ffffff', go: '#ffffff' },
  inverse:    { ink: '#ffffff', accent: '#fbbf24', flytt: '#ffffff', go: '#fbbf24' },
};

export default function FlyttGoLogo({
  size         = 32,
  variant      = 'color',
  showMark     = true,
  showWordmark = true,
  className    = '',
  ariaLabel    = 'FlyttGo',
}: Props) {
  const p = PALETTE[variant];

  /* viewBox dimensions — the mark is a 64-unit square, the wordmark
   * is a 180-unit-wide text block. Combined width depends on which
   * pieces are visible. */
  const MARK_W   = 64;
  const WORD_W   = 180;
  const GAP      = 14;
  const BOX_H    = 64;

  let viewW: number;
  if (showMark && showWordmark) viewW = MARK_W + GAP + WORD_W;
  else if (showMark)            viewW = MARK_W;
  else                          viewW = WORD_W;

  /* Width is computed from the requested height so the bbox stays
   * proportional regardless of which pieces are showing. */
  const heightPx = size;
  const widthPx  = (viewW / BOX_H) * heightPx;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={widthPx}
      height={heightPx}
      viewBox={`0 0 ${viewW} ${BOX_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {showMark && <FMark x={0} ink={p.ink} accent={p.accent} />}
      {showWordmark && (
        <Wordmark
          x={showMark ? MARK_W + GAP : 0}
          flytt={p.flytt}
          go={p.go}
        />
      )}
    </svg>
  );
}

/* ── F-mark ───────────────────────────────────────────────────
 *
 * Composed in two layers:
 *
 *   1. A block "F" drawn as a single closed path UPRIGHT, then
 *      skewX(-14°) on its parent <g> to apply a uniform forward
 *      lean. Skewing rather than hand-slanting each vertex keeps
 *      every stroke at the same angle — the visual cue that says
 *      "italic" rather than "wonky". The translate compensates
 *      for the leftward shift the skew introduces so the mark
 *      stays inside the bbox.
 *
 *   2. A curved teardrop / leaf accent in brand amber drawn
 *      OUTSIDE the skew group so its curves stay organic instead
 *      of stretching with the italic. Sits at the bottom-left of
 *      the mark with its tip aimed at the F's stem, mirroring the
 *      reference brand mark.
 * ──────────────────────────────────────────────────────────── */
function FMark({ x, ink, accent }: { x: number; ink: string; accent: string }) {
  return (
    <g transform={`translate(${x} 0)`}>

      {/* Italic block F — uniform skew on the whole letter so the
          left edge, right edge, and crossbar terminations all share
          the same slant. translate(8 0) keeps the mark visually
          centred after the skew shifts the upper portion left. */}
      <g transform="skewX(-14) translate(8 0)">
        <path
          d="
            M 18 6
            L 54 6
            L 54 18
            L 30 18
            L 30 28
            L 44 28
            L 44 38
            L 30 38
            L 30 58
            L 18 58
            Z
          "
          fill={ink}
        />
      </g>

      {/* Leaf / flame accent. Cubic-curve teardrop with the tip
          aimed up-and-right toward the F's stem; the wide curve
          closes back at the lower-left. The shape lives in the
          unskewed coordinate space so its arcs stay symmetrical
          even though the F leans. */}
      <path
        d="
          M 4 60
          C 4 44, 14 32, 26 30
          C 28 36, 26 46, 20 53
          C 16 57, 10 60, 4 60
          Z
        "
        fill={accent}
      />
    </g>
  );
}

/* ── Wordmark ──────────────────────────────────────────────────
 *
 * "Flytt" + "Go" rendered as bold-italic SVG text. We use the
 * system font stack with explicit italic + 900 weight so the
 * wordmark inherits the platform's preferred bold-italic glyphs
 * without bundling a font file.
 *
 * Letter spacing pulled in slightly (-1.5) so the wordmark reads
 * as a tight unit rather than spaced-out marketing copy. */
function Wordmark({ x, flytt, go }: { x: number; flytt: string; go: string }) {
  const fontFamily =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, " +
    "'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif";

  return (
    <g
      transform={`translate(${x} 0)`}
      fontFamily={fontFamily}
      fontStyle="italic"
      fontWeight={900}
      fontSize={56}
      letterSpacing={-1.5}
    >
      {/* "Flytt" — navy. y=46 baselines it at the visual centre of
          the 64-unit box (height 56 + descender ≈ 8 → 46 looks
          right for a heavy italic). */}
      <text x={0}   y={46} fill={flytt}>Flytt</text>
      {/* "Go" — amber. The Wordmark's intrinsic width depends on the
          renderer's bold-italic glyphs; 96 is the visual end of
          "Flytt" with the chosen letter-spacing. Adjust here if the
          wordmark ever feels mis-spaced in a specific browser. */}
      <text x={104} y={46} fill={go}>Go</text>
    </g>
  );
}

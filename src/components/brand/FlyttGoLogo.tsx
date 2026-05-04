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
 * A slanted block "F" rendered as two filled paths: the dark
 * letter shape itself (top bar, stem, middle bar — angled at the
 * top-left and bottom-left edges to read as forward-leaning), and
 * a teardrop / leaf accent in brand amber tucked into the lower-
 * left negative space where a regular F has its bottom serif.
 *
 * Coordinates are hand-tuned; resizing happens via the parent
 * SVG's viewBox. */
function FMark({ x, ink, accent }: { x: number; ink: string; accent: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {/* Letter body — top bar + stem + middle bar, slanted forward.
          Single closed path so corners read as one unit. */}
      <path
        d="
          M 18 4
          L 60 4
          L 60 16
          L 32 16
          L 32 28
          L 50 28
          L 50 40
          L 32 40
          L 32 60
          L 22 60
          L 18 36
          Z
        "
        fill={ink}
      />
      {/* Leaf / flame accent — orange teardrop nestled at the
          bottom-left where the F's serif would normally sit.
          Drawn as a quadratic-curve closed path that opens toward
          the lower-left. */}
      <path
        d="
          M 6 60
          C 6 46, 14 36, 24 34
          C 22 44, 16 56, 6 60
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

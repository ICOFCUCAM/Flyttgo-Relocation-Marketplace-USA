/* ─────────────────────────────────────────────────────────────────
 * <FlyttGoLogo>
 *
 * THE single brand-mark component. Every navbar, footer, sidebar,
 * auth screen, modal header, and printable report renders this —
 * no inline `<img> + <span>FlyttGo` blocks anywhere else.
 *
 * Structure is locked to a top-aligned flex row:
 *   [ mark ] [ "FlyttGo" wordmark ]
 *            [ "Global Relocation Marketplace" subtitle ]
 *
 *   - flex items-start              — mark + text share the SAME top edge
 *   - flex-col + leading-[1.1]      — wordmark sits directly above subtitle
 *   - NO items-center, NO middle alignment, NO improvisation
 *
 * Variants only swap colours; the geometry never changes.
 * ──────────────────────────────────────────────────────────────── */

export type FlyttGoLogoVariant = 'color' | 'on-dark' | 'mono-dark' | 'mono-light';

interface VariantTokens {
  flytt:    string;
  go:       string;
  subtitle: string;
}

const VARIANT: Record<FlyttGoLogoVariant, VariantTokens> = {
  color:       { flytt: 'text-slate-900', go: 'text-amber-500',  subtitle: 'text-slate-500' },
  'on-dark':   { flytt: 'text-white',     go: 'text-amber-300',  subtitle: 'text-white/60'  },
  'mono-dark': { flytt: 'text-slate-900', go: 'text-slate-900',  subtitle: 'text-slate-500' },
  'mono-light':{ flytt: 'text-white',     go: 'text-white',      subtitle: 'text-white/60'  },
};

export interface FlyttGoLogoProps {
  /** Colour variant. Default 'color'. */
  variant?:   FlyttGoLogoVariant;
  /** Tagline beneath "FlyttGo". Pass `null` to omit. */
  subtitle?:  string | null;
  /** Forwarded to the outer container. */
  className?: string;
}

export default function FlyttGoLogo({
  variant   = 'color',
  subtitle  = 'Global Relocation Marketplace',
  className = '',
}: FlyttGoLogoProps) {
  const t = VARIANT[variant];

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <img
        src="/logo-mark.png"
        alt="FlyttGo"
        className="w-10 h-10 flex-shrink-0 rounded-lg object-cover"
      />

      <div className="flex flex-col leading-[1.1]">
        <span className={`text-lg font-extrabold tracking-tight ${t.flytt}`}>
          Flytt<span className={t.go}>Go</span>
        </span>
        {subtitle && (
          <span className={`text-[10px] uppercase tracking-[0.2em] ${t.subtitle} mt-1`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';

/* ─────────────────────────────────────────────────────────────────
 * <MarketplaceBanner>
 *
 * The single hero banner token used on category, provider, enterprise,
 * subscription, and utility pages. Codifies the typography hierarchy
 * the marketplace standardises on:
 *
 *   - eyebrow      : text-xs uppercase tracking-[0.18em] amber-700
 *   - h1           : 5xl → 7xl, extrabold, tracking-tight, leading-[1.05]
 *   - lead         : text-lg / lg:text-xl, slate-700
 *   - trust pills  : text-xs font-bold (e.g. USDOT · Escrow · Insured)
 *   - CTAs        : amber-400 primary / slate-100 secondary, font-bold
 *
 * Two visual modes:
 *   - default   : light slate-50 wash, slate-900 text — the reference
 *                  design used on enterprise + provider + category pages
 *   - 'inverse' : ink-900 navy with amber accents — for high-impact
 *                  surfaces (Subscriptions, Driver Onboarding) where the
 *                  banner needs to set the page bg colour itself.
 *
 * Optional `breadcrumb` renders the GLRM section index for editorial
 * pages that still want it. Optional `compliancePills` renders trust
 * badges along the bottom of the banner. Optional `aside` accepts any
 * React node (pricing card, screenshot, illustration) to occupy the
 * right column on lg+ screens.
 * ───────────────────────────────────────────────────────────────── */

export type MarketplaceBannerVariant = 'default' | 'inverse';

interface CTA {
  label:    string;
  onClick:  () => void;
  primary?: boolean;
}

interface CompliancePill {
  /** Short label — e.g. "USDOT-compliant", "GVOL-licensed". */
  label: string;
  /** Optional icon node — typically a lucide-react icon size 14. */
  icon?: ReactNode;
}

interface Props {
  /** Tiny uppercase label above the headline — e.g. "ENTERPRISE RELOCATION". */
  eyebrow:        string;
  /** Headline. Keep ≤ 8 words for the typography to read with authority. */
  headline:       ReactNode;
  /** 1–2 sentence subheading. Logistics-authority tone. */
  lead?:          ReactNode;
  /** Optional GLRM section index (e.g. "GLRM.01" + label). */
  breadcrumb?:    { id: string; label: string };
  /** Trust badges along the bottom edge. Keep ≤ 5. */
  compliancePills?: CompliancePill[];
  /** Primary + optional secondary CTA. */
  ctas?:          CTA[];
  /** Optional right-column content (lg+ only). */
  aside?:         ReactNode;
  variant?:       MarketplaceBannerVariant;
  /** Optional background photo URL. Renders behind a dark scrim. Only
   *  applied to the `inverse` variant; `default` stays clean. */
  photoUrl?:      string;
}

export default function MarketplaceBanner({
  eyebrow,
  headline,
  lead,
  breadcrumb,
  compliancePills,
  ctas,
  aside,
  variant = 'default',
  photoUrl,
}: Props) {
  const isInverse = variant === 'inverse';

  const wrapper = isInverse
    ? 'relative bg-ink-900 text-white border-b border-white/5 overflow-hidden'
    : 'relative bg-slate-50 text-slate-900 border-b border-slate-200';

  const eyebrowCls = isInverse
    ? 'text-amber-300 text-xs font-bold uppercase tracking-[0.18em]'
    : 'text-amber-700 text-xs font-bold uppercase tracking-[0.18em]';

  const leadCls = isInverse
    ? 'mt-6 text-lg lg:text-xl leading-relaxed text-white/80 max-w-3xl'
    : 'mt-6 text-lg lg:text-xl leading-relaxed text-slate-700 max-w-3xl';

  const breadcrumbCls = isInverse
    ? 'flex items-baseline gap-3 mb-6 font-mono text-xs uppercase tracking-[0.18em] text-white/60'
    : 'flex items-baseline gap-3 mb-6 font-mono text-xs uppercase tracking-[0.18em] text-slate-500';

  return (
    <section className={wrapper} aria-label={typeof headline === 'string' ? headline : eyebrow}>
      {/* Optional photo + dark scrim — inverse variant only */}
      {isInverse && photoUrl && (
        <div className="absolute inset-0 -z-0">
          <img src={photoUrl} alt="" className="h-full w-full object-cover opacity-40" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b1f3a]/95 via-[#0b1f3a]/85 to-[#0b1f3a]/75" />
        </div>
      )}

      {/* Subtle gradient orb on inverse banners — same next-gen sheen
       *  the homepage hero uses; keeps consistency across surfaces. */}
      {isInverse && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-[24rem] w-[24rem] rounded-full bg-gradient-to-br from-amber-400/20 via-fuchsia-500/10 to-transparent blur-3xl"
        />
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        {breadcrumb && (
          <div className={breadcrumbCls}>
            <span className={isInverse ? 'text-white font-semibold' : 'text-slate-900 font-semibold'}>{breadcrumb.id}</span>
            <span className={isInverse ? 'h-px w-10 bg-white/30' : 'h-px w-10 bg-slate-300'} aria-hidden />
            <span>{breadcrumb.label}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <p className={eyebrowCls}>{eyebrow}</p>
            <h1 className="mt-3 font-extrabold tracking-tight leading-[1.05] text-4xl sm:text-5xl lg:text-6xl xl:text-7xl">
              {headline}
            </h1>
            {lead && <p className={leadCls}>{lead}</p>}

            {compliancePills && compliancePills.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {compliancePills.map(p => (
                  <span
                    key={p.label}
                    className={
                      isInverse
                        ? 'inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-amber-200'
                        : 'inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700'
                    }
                  >
                    {p.icon}
                    {p.label}
                  </span>
                ))}
              </div>
            )}

            {ctas && ctas.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {ctas.map((cta, i) => {
                  const isPrimary = cta.primary ?? i === 0;
                  const cls = isPrimary
                    ? 'inline-flex items-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-xl shadow-lg shadow-amber-500/25 transition'
                    : isInverse
                      ? 'inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition'
                      : 'inline-flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-900 font-bold rounded-xl transition';
                  return (
                    <button key={cta.label} type="button" onClick={cta.onClick} className={cls}>
                      {cta.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {aside && (
            <div className="lg:col-span-5">
              {aside}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

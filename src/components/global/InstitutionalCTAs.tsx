import React from 'react';
import {
  FileText, Send, Rocket, Calendar, Download, type LucideIcon,
} from 'lucide-react';
import { useApp } from '../../lib/store';
import { track } from '../../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <InstitutionalCTAs> — five procurement-compatible entry buttons
 * the platform should surface on every institutional page (per the
 * procurement-compatible-access spec):
 *
 *   1. Request Solution Brief        → /procurement/rfp
 *   2. Submit Procurement Inquiry    → /procurement/rfp
 *   3. Start Pilot Deployment        → /pilot-deployment-programs
 *   4. Schedule Infrastructure Discussion → /contact (mailto fallback)
 *   5. Download Capability Brief     → /resources/capability-brief
 *
 * Reusable on the Government / NGO / University / Enterprise pages
 * + footer CTA strip. Compact mode renders icon-only chips for
 * footer slots; default renders full labels.
 * ───────────────────────────────────────────────────────────────── */

type CtaSlug =
  | 'request-solution-brief'
  | 'submit-procurement-inquiry'
  | 'start-pilot-deployment'
  | 'schedule-infrastructure-discussion'
  | 'download-capability-brief';

interface CtaDef {
  slug:    CtaSlug;
  label:   string;
  icon:    LucideIcon;
  /** Where the CTA navigates. Strings beginning 'page:' are
   *  internal Page enum values; strings beginning 'href:' are
   *  external links handled with window.open(). */
  target:  string;
}

const CTAS: CtaDef[] = [
  { slug: 'request-solution-brief',          label: 'Request Solution Brief',         icon: FileText, target: 'page:procurement-rfp' },
  { slug: 'submit-procurement-inquiry',      label: 'Submit Procurement Inquiry',     icon: Send,     target: 'page:procurement-rfp' },
  { slug: 'start-pilot-deployment',          label: 'Start Pilot Deployment',         icon: Rocket,   target: 'page:pilot-deployment-programs' },
  { slug: 'schedule-infrastructure-discussion', label: 'Schedule Infrastructure Discussion', icon: Calendar, target: 'page:contact' },
  { slug: 'download-capability-brief',       label: 'Download Capability Brief',      icon: Download, target: 'page:capability-brief' },
];

interface Props {
  /** Pick a subset to render. Defaults to all 5. */
  only?:     CtaSlug[];
  /** Compact = icon-only chips (footer / dense UIs). */
  compact?:  boolean;
  /** When true, the primary CTA gets the elevated brand styling;
   *  others render as outline secondaries. Useful in hero
   *  contexts where one CTA should dominate. */
  emphasizePrimary?: boolean;
  className?: string;
}

export default function InstitutionalCTAs({
  only, compact = false, emphasizePrimary = false, className = '',
}: Props) {
  const { setPage } = useApp();
  const ctas = only?.length
    ? CTAS.filter(c => only.includes(c.slug))
    : CTAS;

  function fire(c: CtaDef) {
    track('institutional_cta_clicked', { slug: c.slug });
    if (c.target.startsWith('page:')) {
      const page = c.target.slice(5) as Parameters<typeof setPage>[0];
      setPage(page);
    } else if (c.target.startsWith('href:')) {
      const href = c.target.slice(5);
      if (typeof window !== 'undefined') window.open(href, '_blank', 'noreferrer');
    }
  }

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-1.5 ${className}`}>
        {ctas.map(c => (
          <button
            key={c.slug}
            type="button"
            onClick={() => fire(c)}
            title={c.label}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <c.icon size={14} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {ctas.map((c, i) => {
        const isPrimary = emphasizePrimary && i === 0;
        return (
          <button
            key={c.slug}
            type="button"
            onClick={() => fire(c)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
              isPrimary
                ? 'bg-amber-400 hover:bg-amber-300 text-ink-900 shadow-medium'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
          >
            <c.icon size={14} />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

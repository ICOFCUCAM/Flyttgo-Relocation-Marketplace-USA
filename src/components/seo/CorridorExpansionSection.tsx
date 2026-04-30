import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CorridorEntry } from './seo-content';

/* ─────────────────────────────────────────────────────────────────
 * <CorridorExpansionSection>
 *
 * City-to-city relocation corridor blocks. Two layouts in one
 * component, switched purely by Tailwind responsive classes:
 *
 *   - Mobile  (< lg): vertically stacked accordion, one corridor per
 *                     row, click / keyboard expands to show body
 *   - Desktop (lg+) : two-column grid, every corridor visible —
 *                     better for both scan-ability and for crawlers
 *
 * Both layouts render the SAME h3 + <p> markup so Google's HTML
 * indexer sees the corridor copy regardless of viewport. No
 * client-only conditional rendering — only the open/closed state of
 * the accordion is interactive.
 *
 * Accessibility:
 *   - aria-expanded on each accordion trigger
 *   - aria-controls links the trigger to the body panel
 *   - Native <button> for keyboard activation (Space / Enter)
 *   - prefers-reduced-motion respected via CSS transition only
 *     applying when not reduced
 * ───────────────────────────────────────────────────────────────── */

interface Props {
  /** Section subheading (h2) — e.g. "Popular U.S. relocation corridors". */
  headline:  string;
  corridors: CorridorEntry[];
}

export default function CorridorExpansionSection({ headline, corridors }: Props) {
  /* Unique panel id prefix per mounted instance — multiple
   * CorridorExpansionSection components on one page (rare but
   * possible) won't collide aria-controls ids. */
  const panelIdBase = useId();

  /* Accordion state — only used by the mobile layout. The desktop
   * grid renders all bodies expanded so the open-state is irrelevant
   * there. */
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
        {headline}
      </h2>

      {/* ─── Mobile: accordion ─────────────────────────────── */}
      <ul className="lg:hidden space-y-2" role="list">
        {corridors.map((c, i) => {
          const panelId = `${panelIdBase}-mobile-${i}`;
          const triggerId = `${panelIdBase}-mobile-${i}-t`;
          const isOpen = openIdx === i;
          return (
            <li key={c.heading} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIdx(prev => (prev === i ? null : i))}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {/* h3 inside the trigger keeps the heading hierarchy
                 *  intact for crawlers regardless of accordion state. */}
                <h3 className="text-sm font-bold text-slate-900">{c.heading}</h3>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 flex-shrink-0 transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                hidden={!isOpen}
                className="px-4 pb-4 text-sm text-slate-600 leading-relaxed"
              >
                {c.body}
              </div>
            </li>
          );
        })}
      </ul>

      {/* ─── Desktop: two-column grid ──────────────────────── */}
      <div className="hidden lg:grid grid-cols-2 gap-x-8 gap-y-6">
        {corridors.map(c => (
          <article key={c.heading} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-sm transition">
            <h3 className="text-base font-bold text-slate-900 mb-2">{c.heading}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{c.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

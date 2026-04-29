import { Sparkles, Brain, Zap, Target } from 'lucide-react';

/**
 * "AI smart-matching" marketing section. Communicates the modern
 * matching engine — capacity, distance, customer rating fit, language
 * preference — without overpromising. The actual matching today runs
 * on the dispatch_assign_best_driver SQL function (see VanMan-UK
 * payment_upgrade_migration.sql) which is rule-based, not ML; the
 * upgrade path is to feed the same signals into an LLM-ranked
 * shortlist as data accumulates. Copy reflects today's behaviour
 * with a clear "and getting smarter" stance.
 */

const PILLARS = [
  {
    icon:  Brain,
    code:  'MATCH.01',
    title: 'Capacity-aware matching',
    body:  'Vehicle size, payload, helpers and stairs are matched against your inventory in milliseconds. No more guessing whether a Ford Transit fits your sofa.',
  },
  {
    icon:  Target,
    code:  'MATCH.02',
    title: 'Routing-aware ETA',
    body:  'Dual-track distance: real road routing via OSRM with a Haversine fallback so the ETA you see is the ETA your driver follows.',
  },
  {
    icon:  Sparkles,
    code:  'MATCH.03',
    title: 'Reputation-weighted shortlist',
    body:  'Drivers ranked by completion rate × customer rating × on-time record × your country preference. The top three are surfaced; you pick.',
  },
  {
    icon:  Zap,
    code:  'MATCH.04',
    title: 'Language-aware coordination',
    body:  'Norwegian customers get Norwegian-speaking drivers first. German customers get German-speaking drivers. Cross-border bookings get bilingual crews.',
  },
];

export default function SmartMatchingSection() {
  return (
    <section className="bg-gradient-to-br from-[#0b1f3a] via-[#0b1f3a] to-[#1a2e4f] text-white py-16 sm:py-20 overflow-hidden relative">
      {/* Subtle grid pattern overlay for the "infrastructure" feel
          without going full-tech-doc. */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="match-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#match-grid)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 mb-12 items-end">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 bg-amber-400/15 border border-amber-300/25 text-amber-300 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-5">
              <Sparkles size={12} />
              Smart matching · Updated 2026
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
              The smartest way to <span className="text-amber-300">match a move</span> with a mover.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-base lg:text-lg text-white/75 leading-relaxed">
              Every booking goes through four matching layers — capacity,
              routing, reputation, language. Drivers are ranked in real time
              and the top three are surfaced for you to pick. No black box,
              no surprises.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden">
          {PILLARS.map(p => (
            <article
              key={p.code}
              className="bg-[#0b1f3a] p-6 flex flex-col gap-3 hover:bg-[#1a2e4f] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-11 h-11 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center">
                  <p.icon size={20} />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                  {p.code}
                </span>
              </div>
              <h3 className="font-bold text-white text-lg leading-tight">{p.title}</h3>
              <p className="text-sm text-white/65 leading-relaxed">{p.body}</p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-white/40 max-w-2xl mx-auto leading-relaxed">
          Today’s matching is rule-based on the shared Supabase backend
          (see <span className="font-mono">dispatch_assign_best_driver</span>).
          Smart-ranking and language-weighting upgrades roll in as the
          marketplace accumulates booking history.
        </p>
      </div>
    </section>
  );
}

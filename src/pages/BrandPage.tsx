import { FlyttGoLogo, type FlyttGoLogoVariant } from '../components/brand';

/* ─────────────────────────────────────────────────────────────────
 * /brand
 *
 * Brand showcase. Renders every <FlyttGoLogo> variant on the
 * appropriate background so designers / partners can audit the
 * lockup at a glance.
 * ───────────────────────────────────────────────────────────────── */

const VARIANTS: { id: FlyttGoLogoVariant; label: string; bg: string; tone: string }[] = [
  { id: 'color',       label: 'Color',        bg: 'bg-white',      tone: 'text-slate-700' },
  { id: 'mono-dark',   label: 'Mono · dark',  bg: 'bg-slate-50',   tone: 'text-slate-700' },
  { id: 'mono-light',  label: 'Mono · light', bg: 'bg-[#0b1f3a]',  tone: 'text-white/70' },
  { id: 'on-dark',     label: 'On dark',      bg: 'bg-[#0b1f3a]',  tone: 'text-white/70' },
];

export default function BrandPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">

        <header>
          <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-2">Brand showcase</p>
          <h1 className="text-4xl font-extrabold tracking-tight">FlyttGo logo</h1>
          <p className="text-slate-600 mt-2 text-sm leading-relaxed max-w-2xl">
            One reusable component (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{'<FlyttGoLogo />'}</code>)
            powers every header, footer, sidebar, auth screen, and report. Top-aligned by design — wordmark + subtitle share the same top edge.
          </p>
        </header>

        <section className="grid sm:grid-cols-2 gap-4">
          {VARIANTS.map(v => (
            <div
              key={v.id}
              className={`${v.bg} rounded-2xl border border-slate-200 p-10 flex flex-col items-start gap-4 min-h-[180px]`}
            >
              <FlyttGoLogo variant={v.id} />
              <code className={`text-xs font-mono ${v.tone}`}>variant=&quot;{v.id}&quot;</code>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Without subtitle</h2>
          <div className="bg-white rounded-2xl border border-slate-200 p-10">
            <FlyttGoLogo subtitle={null} />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Usage</h2>
          <div className="bg-slate-900 rounded-2xl p-5 text-xs text-slate-100 font-mono leading-relaxed overflow-x-auto">
            <pre>{`import { FlyttGoLogo } from '@/components/brand';

// Default — color variant + "Global Relocation Marketplace" subtitle
<FlyttGoLogo />

// On a dark surface
<FlyttGoLogo variant="on-dark" />

// Custom subtitle
<FlyttGoLogo variant="on-dark" subtitle="Admin" />

// No subtitle (compact)
<FlyttGoLogo subtitle={null} />`}</pre>
          </div>
        </section>

      </div>
    </main>
  );
}

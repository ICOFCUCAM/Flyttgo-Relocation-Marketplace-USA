import { FlyttGoLogo, type FlyttGoLogoVariant, type FlyttGoLogoSize } from '../components/brand';

/* ─────────────────────────────────────────────────────────────────
 * /brand
 *
 * Brand showcase. Renders every <FlyttGoLogo> variant at every
 * preset size plus the matching favicon assets so a designer /
 * marketer / partner can audit the lockup at a glance.
 * ───────────────────────────────────────────────────────────────── */

const VARIANTS: { id: FlyttGoLogoVariant; label: string; bg: string; tone: string }[] = [
  { id: 'color',       label: 'Color',        bg: 'bg-white',      tone: 'text-slate-700' },
  { id: 'mono-dark',   label: 'Mono · dark',  bg: 'bg-slate-50',   tone: 'text-slate-700' },
  { id: 'mono-light',  label: 'Mono · light', bg: 'bg-[#0b1f3a]',  tone: 'text-white/70' },
  { id: 'on-dark',     label: 'On dark',      bg: 'bg-[#0b1f3a]',  tone: 'text-white/70' },
];

const SIZES: FlyttGoLogoSize[] = ['sm', 'md', 'lg'];

export default function BrandPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">

        <header>
          <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-2">
            Brand showcase
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight">FlyttGo logo</h1>
          <p className="text-slate-600 mt-2 text-sm leading-relaxed max-w-2xl">
            One reusable React component (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{'<FlyttGoLogo />'}</code>)
            powers every header, footer, sidebar, auth screen, and email signature on the platform.
            Three preset sizes, four colour variants, optional subtitle.
          </p>
        </header>

        <section className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 flex items-center justify-center min-h-[180px]">
            <FlyttGoLogo size="lg" variant="color" subtitle="Global relocation marketplace" />
          </div>
          <div className="bg-[#0b1f3a] rounded-2xl border border-[#0b1f3a] p-10 flex items-center justify-center min-h-[180px]">
            <FlyttGoLogo size="lg" variant="on-dark" subtitle="Global relocation marketplace" />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Sizes</h2>
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-end gap-10 flex-wrap">
            {SIZES.map(s => (
              <div key={s} className="flex flex-col items-center gap-2">
                <FlyttGoLogo size={s} variant="color" />
                <span className="text-xs font-mono text-slate-500">size=&quot;{s}&quot;</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Color variants</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {VARIANTS.map(v => (
              <div
                key={v.id}
                className={`${v.bg} rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 min-h-[160px]`}
              >
                <FlyttGoLogo size="md" variant={v.id} subtitle="Global relocation marketplace" />
                <code className={`text-xs font-mono ${v.tone}`}>variant=&quot;{v.id}&quot;</code>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Composition</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 min-h-[160px]">
              <FlyttGoLogo size="md" variant="color" />
              <code className="text-xs font-mono text-slate-500">no subtitle (default)</code>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 min-h-[160px]">
              <FlyttGoLogo size="md" variant="color" markOnly />
              <code className="text-xs font-mono text-slate-500">markOnly</code>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Usage</h2>
          <div className="bg-slate-900 rounded-2xl p-5 text-xs text-slate-100 font-mono leading-relaxed overflow-x-auto">
            <pre>{`import { FlyttGoLogo } from '@/components/brand';

// Default, no subtitle
<FlyttGoLogo />

// Header with tagline subtitle
<FlyttGoLogo size="md" subtitle="Global relocation marketplace" />

// Mark only on a tight slot
<FlyttGoLogo size="sm" markOnly />

// On a navy surface
<FlyttGoLogo size="lg" variant="on-dark" subtitle="Global relocation marketplace" />`}</pre>
          </div>
        </section>

      </div>
    </main>
  );
}

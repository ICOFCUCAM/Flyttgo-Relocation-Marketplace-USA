import { FlyttGoLogo, type FlyttGoLogoVariant } from '../components/brand';

/* ─────────────────────────────────────────────────────────────────
 * /brand
 *
 * Brand showcase. Renders every <FlyttGoLogo> variant at multiple
 * sizes plus the standalone favicon + apple-touch-icon SVGs so a
 * designer / marketer / partner can audit the lockup at a glance.
 *
 * No external assets — every variant is drawn live by the React
 * component or pulled from /public/{favicon,apple-touch-icon}.svg.
 * ───────────────────────────────────────────────────────────────── */

const VARIANTS: { id: FlyttGoLogoVariant; label: string; bg: string; tone: string }[] = [
  { id: 'color',      label: 'Color',       bg: 'bg-white',         tone: 'text-slate-700' },
  { id: 'mono-dark',  label: 'Mono · dark', bg: 'bg-slate-50',      tone: 'text-slate-700' },
  { id: 'mono-light', label: 'Mono · light',bg: 'bg-[#0b1f3a]',     tone: 'text-white/70' },
  { id: 'inverse',    label: 'Inverse',     bg: 'bg-[#0b1f3a]',     tone: 'text-white/70' },
];

const SIZES = [24, 32, 48, 64, 96];

export default function BrandPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">

        {/* ── Header ──────────────────────────────────────── */}
        <header>
          <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-2">
            Brand showcase
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight">FlyttGo logo</h1>
          <p className="text-slate-600 mt-2 text-sm leading-relaxed max-w-2xl">
            Reusable React component (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{'<FlyttGoLogo />'}</code>)
            plus matching <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">favicon.svg</code> and{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">apple-touch-icon.svg</code>.
            All three share the same path geometry — italic block F via uniform skewX, chunky teardrop accent in brand amber.
          </p>
        </header>

        {/* ── Hero — full lockup on both backgrounds ─────── */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 flex items-center justify-center min-h-[180px]">
            <FlyttGoLogo size={64} variant="color" />
          </div>
          <div className="bg-[#0b1f3a] rounded-2xl border border-[#0b1f3a] p-10 flex items-center justify-center min-h-[180px]">
            <FlyttGoLogo size={64} variant="inverse" />
          </div>
        </section>

        {/* ── Size grid ──────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Sizes
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-end gap-6 flex-wrap">
            {SIZES.map(s => (
              <div key={s} className="flex flex-col items-center gap-2">
                <FlyttGoLogo size={s} variant="color" />
                <span className="text-xs font-mono text-slate-500">{s}px</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Variants ───────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Color variants
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {VARIANTS.map(v => (
              <div
                key={v.id}
                className={`${v.bg} rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 min-h-[160px]`}
              >
                <FlyttGoLogo size={48} variant={v.id} />
                <code className={`text-xs font-mono ${v.tone}`}>variant=&quot;{v.id}&quot;</code>
              </div>
            ))}
          </div>
        </section>

        {/* ── Composition flags ──────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Composition
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">

            <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 min-h-[160px]">
              <FlyttGoLogo size={56} variant="color" />
              <code className="text-xs font-mono text-slate-500">full lockup (default)</code>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 min-h-[160px]">
              <FlyttGoLogo size={56} variant="color" showWordmark={false} />
              <code className="text-xs font-mono text-slate-500">showWordmark={'{false}'}</code>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 min-h-[160px]">
              <FlyttGoLogo size={56} variant="color" showMark={false} />
              <code className="text-xs font-mono text-slate-500">showMark={'{false}'}</code>
            </div>

          </div>
        </section>

        {/* ── Standalone SVG assets ──────────────────────── */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Standalone SVG assets
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
              <img src="/favicon.svg" alt="FlyttGo favicon" width={64} height={64} className="rounded-lg" />
              <div className="text-center">
                <p className="text-sm font-bold">/favicon.svg</p>
                <p className="text-xs text-slate-500 mt-0.5">Browser tab + bookmark icon (16-64px)</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
              <img src="/apple-touch-icon.svg" alt="FlyttGo home-screen tile" width={120} height={120} className="rounded-2xl shadow-sm" />
              <div className="text-center">
                <p className="text-sm font-bold">/apple-touch-icon.svg</p>
                <p className="text-xs text-slate-500 mt-0.5">iOS home-screen tile (180×180)</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Usage cheatsheet ───────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Usage
          </h2>
          <div className="bg-slate-900 rounded-2xl p-5 text-xs text-slate-100 font-mono leading-relaxed overflow-x-auto">
            <pre>{`import { FlyttGoLogo } from '@/components/brand';

// Full lockup, default size (32px)
<FlyttGoLogo />

// Mark only, larger, on a navy hero
<FlyttGoLogo size={64} variant="inverse" showWordmark={false} />

// Wordmark only for a footer strip
<FlyttGoLogo size={20} variant="mono-dark" showMark={false} />

// Monochrome white on a dark surface
<FlyttGoLogo size={40} variant="mono-light" />`}</pre>
          </div>
        </section>

      </div>
    </main>
  );
}

import type { ReactNode } from 'react';
import { FlyttGoLogo } from '../../components/brand';

/**
 * Shared workspace chrome for /accounting + /audit. Renders the
 * editorial enterprise layout the spec asks for (Phase 17):
 *
 *   • Mono section codes (AC.01, AC.02 ...)
 *   • Tabular numerals on every numeric column
 *   • Print stylesheet (Phase 13) hides the side rail and the action
 *     bar so a `Save as PDF` produces a regulator-ready document
 *
 * The component is layout-only — content is composed by the parent
 * via the `sections` prop.
 */

export interface WorkspaceSection {
  /** Editorial code shown in the rail and at the top of the section. */
  code:     string;            // e.g. 'AC.01'
  /** Section title — short, no trailing punctuation. */
  label:    string;
  /** Body content. */
  body:     ReactNode;
  /** Optional right-aligned actions rendered next to the section title. */
  actions?: ReactNode;
}

export default function WorkspaceShell({
  workspaceLabel,
  workspaceCode,
  jurisdictionLabel,
  user,
  sections,
  topBarRight,
}: {
  workspaceLabel:    string;       // 'Accounting' / 'Audit'
  workspaceCode:     string;       // 'AC' / 'AU'
  jurisdictionLabel: string;       // 'Norway · NOK' etc.
  user:              { email?: string | null; full_name?: string | null } | null;
  sections:          WorkspaceSection[];
  topBarRight?:      ReactNode;
}) {
  const userLabel = user?.full_name ?? user?.email ?? 'Operator';

  return (
    <main className="min-h-screen bg-[#fbfbf8] text-slate-900">
      <style>{`
        @media print {
          .ws-side, .ws-topbar, .no-print { display: none !important; }
          .ws-main { padding: 0 !important; }
          .ws-section { break-inside: avoid; page-break-inside: avoid; }
          table { border-collapse: collapse; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* Top bar */}
      <header className="ws-topbar bg-[#0b1f3a] text-white">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <FlyttGoLogo variant="on-dark" subtitle={`${workspaceLabel} Workspace`} />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/50 font-mono">{jurisdictionLabel}</p>
              <p className="text-xs font-semibold text-white/85 truncate max-w-[200px]">{userLabel}</p>
            </div>
            {topBarRight}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-12 gap-8">

        {/* Section rail (sidebar) */}
        <aside className="ws-side lg:col-span-3 lg:sticky lg:top-6 self-start">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-mono mb-3">
            {workspaceCode} · Sections
          </p>
          <nav className="space-y-1.5">
            {sections.map(s => (
              <a
                key={s.code}
                href={`#${s.code.replace(/\./g, '-').toLowerCase()}`}
                className="block px-3 py-2 rounded-md hover:bg-slate-100 transition group"
              >
                <span className="font-mono text-[11px] text-slate-400 group-hover:text-slate-600 mr-2">{s.code}</span>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{s.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="ws-main lg:col-span-9 space-y-12">
          {sections.map(s => {
            const id = s.code.replace(/\./g, '-').toLowerCase();
            return (
              <section key={s.code} id={id} className="ws-section scroll-mt-6">
                <div className="flex items-baseline justify-between gap-3 mb-4 pb-2 border-b border-slate-200">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-700 mr-3">{s.code}</span>
                    <span className="text-xl font-extrabold tracking-tight">{s.label}</span>
                  </div>
                  {s.actions && <div className="no-print">{s.actions}</div>}
                </div>
                <div className="text-sm">{s.body}</div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

import { NAV_ITEMS, type DashTab } from './types';
import { FlyttGoLogo } from '../brand';

export function Sidebar({
  current,
  onSelect,
}: {
  current: DashTab;
  onSelect: (t: DashTab) => void;
}) {
  return (
    <aside className="w-64 bg-[#0B2E59] text-white flex-shrink-0 flex-col hidden lg:flex">
      <div className="p-6 border-b border-white/10">
        <FlyttGoLogo
          size="sm"
          variant="on-dark"
          subtitle="Corporate Dashboard"
        />
      </div>

      <nav className="flex-1 py-4" aria-label="Corporate sections">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            aria-current={current === item.id ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset ${
              current === item.id ? 'bg-white/10 text-white font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>

      <div className="p-5 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-bold" aria-hidden="true">AB</div>
          <div>
            <div className="text-xs font-medium">Acme Logistics AS</div>
            <div className="text-xs text-white/50">Enterprise Plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

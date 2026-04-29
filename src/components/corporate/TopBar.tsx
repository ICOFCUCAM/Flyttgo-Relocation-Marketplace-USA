import { NAV_ITEMS, type DashTab } from './types';

export function TopBar({
  tab,
  onActivate,
}: {
  tab: DashTab;
  onActivate: () => void;
}) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div>
        <h1 className="text-xl font-bold text-gray-900 capitalize">
          {NAV_ITEMS.find(n => n.id === tab)?.label || 'Overview'}
        </h1>
        <p className="text-xs text-gray-400">FlyttGo Corporate · Enterprise Dashboard Preview</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-medium">⚡ Live Mode</span>
        <button
          onClick={onActivate}
          className="px-4 py-2 bg-[#0B2E59] text-white rounded-xl text-sm font-semibold hover:bg-[#1a4a8a] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        >
          Activate Account
        </button>
      </div>
    </header>
  );
}

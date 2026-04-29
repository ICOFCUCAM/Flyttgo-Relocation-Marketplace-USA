import { ADMIN_TABS, type AdminTab } from './types';

export function AdminSidebar({
  current,
  onSelect,
}: {
  current: AdminTab;
  onSelect: (tab: AdminTab) => void;
}) {
  return (
    <aside className="w-64 bg-gray-900 text-white flex-shrink-0">
      <div className="p-6 font-bold text-lg">FlyttGo Admin</div>
      <nav aria-label="Admin sections">
        {ADMIN_TABS.map(t => (
          <button
            key={t}
            onClick={() => onSelect(t)}
            aria-current={current === t ? 'page' : undefined}
            className={`block w-full text-left px-6 py-3 capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset ${
              current === t ? 'bg-emerald-600' : 'hover:bg-gray-800'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>
    </aside>
  );
}

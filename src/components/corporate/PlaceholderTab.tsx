import { NAV_ITEMS, type DashTab } from './types';

export function PlaceholderTab({
  tab,
  onActivate,
}: {
  tab: DashTab;
  onActivate: () => void;
}) {
  const item = NAV_ITEMS.find(n => n.id === tab);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <div className="text-5xl mb-4" aria-hidden="true">{item?.icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{item?.label}</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        This module is available on the Enterprise plan. Activate your account to unlock full access.
      </p>
      <button
        onClick={onActivate}
        className={`px-8 py-3 bg-[#0B2E59] text-white rounded-xl font-semibold hover:bg-[#1a4a8a] transition ${FOCUS_RING}`}
      >
        Activate Corporate Account
      </button>
    </div>
  );
}

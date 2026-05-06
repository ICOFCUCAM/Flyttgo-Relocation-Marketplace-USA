
const COLORS: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  blue:    'bg-blue-50 text-blue-600',
  purple:  'bg-purple-50 text-purple-600',
  orange:  'bg-orange-50 text-orange-600',
};

export function StatCard({
  icon, label, value, sub, color = 'emerald',
}: {
  icon:   string;
  label:  string;
  value:  string;
  sub?:   string;
  color?: keyof typeof COLORS | string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className={`w-10 h-10 ${COLORS[color] || COLORS.emerald} rounded-xl flex items-center justify-center text-lg mb-3`} aria-hidden="true">
        {icon}
      </div>
      <div className="text-2xl font-extrabold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

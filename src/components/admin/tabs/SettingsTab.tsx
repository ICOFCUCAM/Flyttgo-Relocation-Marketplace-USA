import {
  usePlatformSettings,
  useUpdatePlatformSetting,
} from '../../../hooks/queries/useAdminDashboard';

const PRICING_FIELDS = [
  { key: 'base_price_per_km',     label: 'Price per KM (USD)',           placeholder: 'e.g. 12.50' },
  { key: 'minimum_booking_price', label: 'Minimum Booking Price (USD)',  placeholder: 'e.g. 299'   },
  { key: 'commission_rate',       label: 'Commission Rate (%)',          placeholder: 'e.g. 15'    },
];

const FLAG_FIELDS = [
  { key: 'driver_auto_approval',  label: 'Auto-approve drivers' },
  { key: 'escrow_enabled',        label: 'Escrow enabled' },
  { key: 'surge_enabled',         label: 'Surge pricing enabled' },
  { key: 'wallet_enabled',        label: 'Driver wallet enabled' },
  { key: 'subscriptions_enabled', label: 'Subscriptions enabled' },
];

export function SettingsTab({ enabled }: { enabled: boolean }) {
  const { data: settings = {} } = usePlatformSettings(enabled);
  const update = useUpdatePlatformSetting();

  function set(key: string, value: string) {
    update.mutate({ key, value });
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Platform Settings</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-8">
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Platform Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            {PRICING_FIELDS.map(field => (
              <div key={field.key}>
                <label htmlFor={`setting-${field.key}`} className="block text-sm font-medium text-gray-600 mb-1">
                  {field.label}
                </label>
                <input
                  id={`setting-${field.key}`}
                  value={settings[field.key] || ''}
                  onChange={e => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Marketplace Controls</h2>
          <div className="space-y-3">
            {FLAG_FIELDS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings[key] === 'true'}
                  onChange={e => set(key, String(e.target.checked))}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

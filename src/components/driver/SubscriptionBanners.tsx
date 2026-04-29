import { useTranslation } from 'react-i18next';

export function SubscriptionBanners({
  needsSubscription,
  subExpiry,
  onOpenSubscription,
}: {
  needsSubscription: boolean;
  subExpiry: number | null;
  onOpenSubscription: () => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      {needsSubscription && (
        <div role="alert" className="px-6 py-3 text-sm font-medium flex items-center justify-between bg-yellow-50 text-yellow-800 border-b border-yellow-200">
          <span>⚠️ {t('driverPortal.subNeededBanner')}</span>
          <button onClick={onOpenSubscription} className="ml-4 underline text-xs font-semibold">View plans</button>
        </div>
      )}

      {subExpiry !== null && subExpiry <= 7 && subExpiry > 0 && (
        <div role="alert" className={`px-6 py-3 text-sm font-medium flex items-center justify-between ${
          subExpiry <= 3
            ? 'bg-red-50 text-red-700 border-b border-red-200'
            : 'bg-orange-50 text-orange-700 border-b border-orange-200'
        }`}>
          <span>
            {subExpiry <= 3
              ? `🔴 Subscription expires in ${subExpiry} day${subExpiry !== 1 ? 's' : ''} — renew now`
              : `🟡 Subscription expires in ${subExpiry} days`}
          </span>
          <button onClick={onOpenSubscription} className="ml-4 underline text-xs font-semibold">Renew</button>
        </div>
      )}
    </>
  );
}

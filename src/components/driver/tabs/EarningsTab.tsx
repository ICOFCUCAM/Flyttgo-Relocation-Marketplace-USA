import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { EarningsCalculator } from '../EarningsCalculator';
import type { WalletRow } from '../../../services/driver';

export function EarningsTab({
  wallet,
  plan,
}: {
  wallet: WalletRow | null | undefined;
  plan: string | null | undefined;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border">
        <h2 className="font-bold text-lg mb-4">{t('driverPortal.earningsSummary')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card title="Total Earned" value={wallet?.total_earned} />
          <Card title="This Month"   value={0} />
          <Card title="Pending"      value={wallet?.pending} />
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl border">
        <h2 className="font-bold text-lg mb-1">{t('driverPortal.earningsCalc')}</h2>
        <p className="text-sm text-gray-500 mb-5">Estimate your net earnings for any job before you accept.</p>
        <EarningsCalculator plan={plan ?? 'basic'} />
      </div>
    </div>
  );
}

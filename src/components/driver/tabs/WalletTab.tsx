import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { safeNumber } from '../utils';
import {
  useDriverWallet,
  useDriverTransactions,
  useRequestPayout,
} from '../../../hooks/queries/useDriverPortal';

export function WalletTab({ driverId }: { driverId: string | null | undefined }) {
  const { t } = useTranslation();
  const { data: wallet }       = useDriverWallet(driverId);
  const { data: transactions = [] } = useDriverTransactions(driverId);
  const payout = useRequestPayout(driverId);

  function handlePayout() {
    if (safeNumber(wallet?.balance) < 500) {
      toast('Minimum payout is $50');
      return;
    }
    payout.mutate(safeNumber(wallet?.balance), {
      onSuccess: () => toast.success('Payout request submitted'),
      onError:   e => toast.error('Payout failed', { description: e instanceof Error ? e.message : '' }),
    });
  }

  return (
    <div className="bg-white p-6 rounded-xl border">
      <h2 className="font-bold text-lg mb-4">{t('driverPortal.walletBalance')}</h2>
      <p className="text-3xl font-bold text-emerald-600 mb-1">{safeNumber(wallet?.balance).toFixed(0)} USD</p>
      <p className="text-sm text-gray-500 mb-6">{t('driverPortal.availableBalance')}</p>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-xl font-bold">{safeNumber(wallet?.pending).toFixed(0)} USD</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Earned</p>
          <p className="text-xl font-bold">{safeNumber(wallet?.total_earned).toFixed(0)} USD</p>
        </div>
      </div>
      <button
        onClick={handlePayout}
        disabled={payout.isPending}
        className="bg-blue-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
      >
        {t('driverPortal.requestPayout')}
      </button>
      {transactions.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Recent Transactions</h3>
          <div className="space-y-2">
            {transactions.slice(0, 10).map(tx => (
              <div key={tx.id} className="flex justify-between text-sm py-2 border-b">
                <span className="text-gray-600">{tx.description ?? tx.type}</span>
                <span className="font-medium text-emerald-600">+{safeNumber(tx.amount).toFixed(0)} USD</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

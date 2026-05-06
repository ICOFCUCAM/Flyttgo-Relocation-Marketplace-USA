import { Card } from '../Card';
import { FOCUS_RING } from '../../ds';
import { daysLeft } from '../utils';
import type { WalletRow, SubscriptionRow } from '../../../services/driver';
import { DemandHeatmap } from '../DemandHeatmap';
import StripeConnectCard from '../StripeConnectCard';

export function OverviewTab({
  wallet,
  subscription,
  country,
  userId,
  onOpenSubscription,
}: {
  wallet: WalletRow | null | undefined;
  subscription: SubscriptionRow | null | undefined;
  country: string;
  userId: string | null | undefined;
  onOpenSubscription: () => void;
}) {
  const subExpiry = subscription ? daysLeft(subscription.end_date) : null;
  const tone =
    subExpiry !== null && subExpiry <= 3 ? 'border-red-200' :
    subExpiry !== null && subExpiry <= 7 ? 'border-orange-200' : 'border-gray-100';
  const expiryTone =
    subExpiry !== null && subExpiry <= 3 ? 'text-red-500 font-semibold' :
    subExpiry !== null && subExpiry <= 7 ? 'text-orange-500' : 'text-gray-400';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Wallet Balance" value={wallet?.balance} />
        <Card title="Pending"        value={wallet?.pending} />
        <Card title="Total Earned"   value={wallet?.total_earned} />
      </div>
      {subscription && (
        <div className={`bg-white rounded-xl p-5 border shadow-sm ${tone}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-0.5">Active Plan</div>
              <div className="text-lg font-bold text-gray-900 capitalize">{subscription.plan}</div>
              {subscription.end_date && (
                <div className={`text-xs mt-0.5 ${expiryTone}`}>
                  {subExpiry !== null && subExpiry > 0 ? `Expires in ${subExpiry} days` : '⚠️ Expired'}
                </div>
              )}
            </div>
            <button
              onClick={onOpenSubscription}
              className={`text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition ${FOCUS_RING}`}
            >
              Manage
            </button>
          </div>
        </div>
      )}

      {/* Stripe Connect — self-serve KYC + bank collection. Renders
       *  the right state-machine card based on the driver's
       *  stripe_connect_accounts row (created automatically when
       *  their application is approved). */}
      {userId && <StripeConnectCard userId={userId} />}

      {/* Demand heatmap — top cities by recent booking volume in
       *  the driver's market. Helps the driver position for the
       *  highest dispatch rate. Renders an empty-state on a fresh
       *  market with no bookings yet. */}
      <DemandHeatmap country={country} />
    </div>
  );
}

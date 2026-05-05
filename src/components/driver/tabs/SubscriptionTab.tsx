import { useMemo, useState } from 'react';
import { FOCUS_RING } from '../../ds';
import { useApp } from '../../../lib/store';
import { calculateProration, daysLeft } from '../utils';
import { PLAN_OPTIONS, VAT_RATE, type PlanOption } from '../types';
import { localPriceForTier } from '../../../lib/subscription-tiers';
import type { PricingCountry } from '../../../lib/pricing-engine';
import {
  useChangeSubscription,
  useCreateSubscriptionCheckout,
  useLogSubscriptionCredit,
} from '../../../hooks/queries/useDriverPortal';
import type { SubscriptionRow, DriverRow } from '../../../services/driver';

export function SubscriptionTab({
  subscription,
  driver,
  userId,
}: {
  subscription: SubscriptionRow | null | undefined;
  driver:       DriverRow | null | undefined;
  userId:       string | null | undefined;
}) {
  const { setPage } = useApp();
  const [changing, setChanging] = useState<string | null>(null);

  const change          = useChangeSubscription(userId);
  const checkout        = useCreateSubscriptionCheckout();
  const logCredit       = useLogSubscriptionCredit();

  /* Pricing country for this driver. Sourced from driver_profiles.zone
   * (the same column the onboarding flow writes to), normalised to
   * lowercase for the PricingCountry enum. Defaults to 'us' when the
   * driver hasn't been assigned a zone yet — matches the marketing
   * shopfront's default. */
  const country: PricingCountry = useMemo(() => {
    const z = (driver?.zone ?? '').toLowerCase();
    return (z || 'us') as PricingCountry;
  }, [driver?.zone]);

  const subExpiry = subscription ? daysLeft(subscription.end_date) : null;
  const headerTone =
    subExpiry !== null && subExpiry <= 3 ? 'border-red-200' :
    subExpiry !== null && subExpiry <= 7 ? 'border-orange-200' : 'border-emerald-200';
  const expiryTone =
    subExpiry !== null && subExpiry <= 3 ? 'text-red-500 font-semibold' :
    subExpiry !== null && subExpiry <= 7 ? 'text-orange-500' : 'text-gray-500';

  async function subscribe(plan: PlanOption) {
    if (!userId || !driver) return;
    setChanging(plan.id);
    try {
      /* Use the local-currency price for this driver's market. The
       * country's localPriceForTier override (when present) is the
       * canonical price; falls back to plan.priceUSD baseline. */
      const local = localPriceForTier(plan.id, country);
      const localPrice = local.amount;
      const checkoutCurrency = local.currency.toLowerCase();
      const isFreeLocal = local.isFree;

      if (isFreeLocal) {
        await change.mutateAsync(plan.id);
        alert(`Switched to ${plan.label} plan.`);
        return;
      }

      const proration = calculateProration(subscription, plan);
      let amountExVat: number, vatAmount: number, totalAmount: number, prorationNote = '';

      if (proration?.isFullyCovered) {
        await change.mutateAsync(plan.id);
        await logCredit.mutateAsync({
          driverId:    driver.id,
          amount:      proration.creditExVat,
          description: `Plan credit — ${proration.daysRemaining} unused Gold Pro days`,
        });
        alert('Upgraded to Infrastructure Partner. Your remaining Gold Pro credit fully covered the cost — no charge.');
        return;
      }

      if (proration && !proration.isFullyCovered) {
        amountExVat   = proration.dueExVat;
        vatAmount     = proration.dueVat;
        totalAmount   = proration.dueTotal;
        prorationNote = `Gold Pro → Infrastructure proration: ${proration.daysRemaining}d remaining on Gold Pro → credit ${proration.creditExVat} ${local.currency} ex VAT`;
      } else {
        amountExVat   = localPrice;
        vatAmount     = Math.round(localPrice * VAT_RATE);
        totalAmount   = amountExVat + vatAmount;
      }

      const session = await checkout.mutateAsync({
        type:        'subscription',
        planId:      plan.id,
        planLabel:   plan.label,
        driverId:    driver.id,
        userId,
        amount:      totalAmount,
        amountExVat,
        vatAmount,
        billing:     plan.billing,
        currency:    checkoutCurrency,
        prorationNote,
        proration: proration ? {
          creditApplied:    proration.creditExVat,
          daysRemaining:    proration.daysRemaining,
          daysInMonth:      proration.daysInMonth,
          fromPlan:         'gold_pro',
          fromPlanFullCost: localPriceForTier('gold_pro', country).amount,
        } : null,
        description: proration
          ? `FlyttGo ${plan.label} (prorated ${proration.daysRemaining}d, plus sales tax)`
          : `FlyttGo ${plan.label} Subscription (plus sales tax)`,
      });

      if (!session.url) {
        alert('Unable to start payment session. Please try again.');
        return;
      }
      window.location.href = session.url;
    } catch (err) {
      console.error('subscribeToPlan error:', err);
      alert('Payment initiation failed. Please try again.');
    } finally {
      setChanging(null);
    }
  }

  return (
    <div className="space-y-6">
      {subscription ? (
        <div className={`bg-white rounded-xl p-6 shadow-sm border ${headerTone}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Current Plan</div>
              <div className="text-2xl font-bold text-gray-900 capitalize">{subscription.plan}</div>
              <div className="text-sm text-gray-500 mt-1">
                Status: <span className={`font-medium ${subscription.status === 'active' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {subscription.status}
                </span>
              </div>
              {subscription.end_date && (
                <div className={`text-sm mt-1 ${expiryTone}`}>
                  {subExpiry !== null && subExpiry > 0
                    ? `Expires in ${subExpiry} day${subExpiry !== 1 ? 's' : ''} — ${new Date(subscription.end_date).toLocaleDateString()}`
                    : `⚠️ Expired ${new Date(subscription.end_date).toLocaleDateString()}`}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200 text-center">
          <p className="font-bold text-gray-900 mb-1">No Active Subscription</p>
          <p className="text-sm text-gray-500 mb-4">Subscribe to unlock higher dispatch priority and lower commission rates.</p>
          <button
            onClick={() => setPage('subscriptions')}
            className={`px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition ${FOCUS_RING}`}
          >
            View Subscription Plans →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLAN_OPTIONS.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            country={country}
            current={subscription?.plan === plan.id}
            isLoading={changing === plan.id}
            anyLoading={!!changing}
            subscription={subscription ?? null}
            onSubscribe={subscribe}
          />
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  plan, country, current, isLoading, anyLoading, subscription, onSubscribe,
}: {
  plan:         PlanOption;
  country:      PricingCountry;
  current:      boolean;
  isLoading:    boolean;
  anyLoading:   boolean;
  subscription: SubscriptionRow | null;
  onSubscribe:  (plan: PlanOption) => void;
}) {
  /* Localised price for this driver's country — the same renderer
   * the marketing shopfront uses, so a driver in DE sees EUR and a
   * driver in NO sees NOK. Falls back to USD when the slug isn't a
   * recognised SUBSCRIPTION_TIERS entry. */
  const local     = localPriceForTier(plan.id, country);
  const vatAmount = Math.round(local.amount * VAT_RATE);
  const totalLocal = local.amount + vatAmount;
  const isPaid    = !local.isFree;
  const pro       = calculateProration(subscription, plan);

  const cardBorder = current
    ? `${plan.color} shadow-md`
    : 'border-gray-200 hover:shadow-sm';
  const popular = plan.highlight ? 'ring-2 ring-emerald-400 ring-offset-1' : '';

  return (
    <div className={`bg-white border-2 rounded-2xl p-5 flex flex-col transition ${cardBorder} ${popular}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-gray-900">{plan.label}</div>
        {current   && <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">Current</span>}
        {plan.highlight && !current && <span className="text-xs bg-emerald-600 text-white px-2.5 py-0.5 rounded-full font-semibold">Popular</span>}
      </div>
      {!isPaid && (
        <div className="mb-3">
          <span className="text-2xl font-bold text-gray-900">Free</span>
        </div>
      )}
      {isPaid && (
        <div className="mb-3">
          <span className="text-2xl font-bold text-gray-900">{local.formatted}</span>
          <span className="text-xs text-gray-500 ml-1">{local.cadenceLabel.trim()}</span>
        </div>
      )}
      <div className="text-xs text-gray-500 mb-1">Commission: <strong>{plan.commission}</strong></div>
      <div className="text-xs text-gray-400 mb-4 flex-1">{plan.description}</div>

      {current ? (
        <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center bg-gray-100 text-gray-400 cursor-default">✓ Current Plan</div>
      ) : isLoading ? (
        <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center bg-gray-100 text-gray-400 animate-pulse">Processing…</div>
      ) : isPaid ? (
        <div className="space-y-2">
          {!pro && (
            <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1 mb-1">
              <div className="flex justify-between text-gray-600"><span>Price (ex VAT)</span><span>{local.formatted}</span></div>
              <div className="flex justify-between text-gray-600"><span>Sales Tax</span><span>{vatAmount.toLocaleString()} {local.currency}</span></div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1">
                <span>Total</span>
                <span className="text-emerald-700">{totalLocal.toLocaleString()} {local.currency}</span>
              </div>
            </div>
          )}
          {!pro?.isFullyCovered && (
            <button
              onClick={() => onSubscribe(plan)}
              disabled={anyLoading}
              className={`w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 ${FOCUS_RING}`}
            >
              Pay {(pro ? pro.dueTotal : totalLocal).toLocaleString()} {pro ? 'USD' : local.currency}
            </button>
          )}
          {pro?.isFullyCovered && (
            <button
              onClick={() => onSubscribe(plan)}
              disabled={anyLoading}
              className={`w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 ${FOCUS_RING}`}
            >
              Switch Now — No Charge
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => onSubscribe(plan)}
          disabled={anyLoading}
          className={`w-full py-2.5 rounded-xl text-sm font-bold bg-gray-800 text-white hover:bg-gray-900 transition disabled:opacity-50 ${FOCUS_RING}`}
        >
          Switch to {plan.label}
        </button>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { useApp } from '../lib/store';
import { useDriverLocationBeacon } from '../hooks/useDriverLocationBeacon';
import {
  useDriverApplication,
  useDriverProfile,
  useDriverSubscription,
  useDriverJobs,
  useToggleDriverOnline,
} from '../hooks/queries/useDriverPortal';
import { PortalGateScreen }   from './driver/PortalGateScreen';
import { SubscriptionBanners } from './driver/SubscriptionBanners';
import { OverviewTab }     from './driver/tabs/OverviewTab';
import { JobsTab }         from './driver/tabs/JobsTab';
import { EarningsTab }     from './driver/tabs/EarningsTab';
import { WalletTab }       from './driver/tabs/WalletTab';
import { SubscriptionTab } from './driver/tabs/SubscriptionTab';
import { useDriverWallet } from '../hooks/queries/useDriverPortal';
import { daysLeft }        from './driver/utils';
import { PORTAL_TABS, type PortalGate, type PortalTab } from './driver/types';

/**
 * DriverPortal — orchestration shell.
 *
 * Owns: tab selection + online toggle + gate evaluation. Delegates
 * fetching to React Query hooks (services/driver), per-tab UI to
 * components under /driver/tabs, gate screens to PortalGateScreen.
 */
export default function DriverPortal() {
  const { profile, user } = useAuth();
  const { setPage }       = useApp();
  const { t }             = useTranslation();

  const [activeTab, setActiveTab] = useState<PortalTab>('overview');

  const { data: application, isLoading: appLoading } = useDriverApplication(user?.id);
  const { data: driver,      isLoading: drvLoading } = useDriverProfile(user?.id);
  const { data: subscription, isLoading: subLoading } = useDriverSubscription(user?.id);

  /* Plan needed for jobs query, so route plan-aware. Default to free
   * when no subscription row exists (brand-new approved drivers). */
  const plan = subscription?.plan ?? 'free';
  useDriverJobs(driver?.id, plan); // pre-warm cache so JobsTab is instant

  const { data: wallet } = useDriverWallet(driver?.id);
  const toggleOnlineMut  = useToggleDriverOnline(driver?.id, user?.id);

  /* Push the driver's GPS to driver_locations every ~10s while there's
   * an active job. The hook returns immediately when jobs is empty. */
  const { data: jobs = [] } = useDriverJobs(driver?.id, plan);
  useDriverLocationBeacon({
    driverId: user?.id ?? null,
    jobs:     jobs.map(j => ({ id: j.id, status: (j.status ?? null) as string | null })),
  });

  /* Auto-flip to subscription tab when an approved driver lands here
   * without an active subscription. */
  useEffect(() => {
    if (!driver) return;
    if (driver.status === 'suspended') return;
    const needsSubscription = !subscription || subscription.subscription_status !== 'active';
    if (needsSubscription && activeTab !== 'subscription') {
      setActiveTab('subscription');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver, subscription]);

  /* ── Gate evaluation ── */
  const loading = appLoading || drvLoading || subLoading;
  const gate: PortalGate = (() => {
    if (loading) return 'loading';
    if (!application) return 'no-application';
    if (application.status === 'pending')  return 'application-pending';
    if (application.status === 'rejected') return 'application-rejected';
    if (!driver)                            return 'no-driver-profile';
    if (driver.status === 'suspended')      return 'suspended';
    if (!subscription || subscription.subscription_status !== 'active') return 'subscription-needed';
    return 'ready';
  })();

  const subExpiry = subscription ? daysLeft(subscription.end_date) : null;
  const subExpired = subExpiry !== null && subExpiry <= 0;

  if (gate !== 'ready' && gate !== 'subscription-needed') {
    return (
      <PortalGateScreen
        gate={gate}
        subExpired={subExpired}
        onOpenSubscription={() => setActiveTab('subscription')}
      />
    );
  }

  function toggleOnline() {
    if (!driver) return;
    const next = !(driver.online === true);
    toggleOnlineMut.mutate(next);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 flex justify-between items-center border-b">
        <div>
          <h1 className="text-xl font-bold">{t('driverPortal.title')}</h1>
          {subscription && (
            <div className={`text-xs mt-0.5 ${
              subExpiry !== null && subExpiry <= 3 ? 'text-red-500 font-semibold' :
              subExpiry !== null && subExpiry <= 7 ? 'text-orange-500' : 'text-gray-400'
            }`}>
              {subscription.plan} plan
              {subExpiry !== null && subExpiry > 0 && ` · expires in ${subExpiry}d`}
              {subExpiry !== null && subExpiry <= 0 && ' · ⚠️ expired'}
            </div>
          )}
        </div>
        <button
          onClick={toggleOnline}
          aria-pressed={driver?.online === true}
          className={`px-4 py-2 rounded-full font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${
            driver?.online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {driver?.online ? t('driverPortal.online') : t('driverPortal.offline')}
        </button>
      </div>

      <SubscriptionBanners
        needsSubscription={gate === 'subscription-needed'}
        subExpiry={subExpiry}
        onOpenSubscription={() => setActiveTab('subscription')}
      />

      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex gap-2 mb-6 flex-wrap" role="tablist">
          {PORTAL_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              className={`px-4 py-2 rounded capitalize text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                activeTab === tab ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {t(`driverPortal.${tab}`)}
            </button>
          ))}
          <button
            onClick={() => setPage('provider-pricing-settings')}
            className="px-4 py-2 rounded text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <DollarSign size={14} />
            Pricing
          </button>
        </div>

        {activeTab === 'overview' && (
          <OverviewTab
            wallet={wallet}
            subscription={subscription}
            onOpenSubscription={() => setActiveTab('subscription')}
          />
        )}
        {activeTab === 'jobs'         && <JobsTab driverId={driver?.id} plan={plan} />}
        {activeTab === 'earnings'     && <EarningsTab wallet={wallet} plan={plan} />}
        {activeTab === 'wallet'       && <WalletTab driverId={driver?.id} />}
        {activeTab === 'subscription' && (
          <SubscriptionTab
            subscription={subscription}
            driver={driver}
            userId={user?.id ?? null}
          />
        )}
      </div>
    </div>
  );
}

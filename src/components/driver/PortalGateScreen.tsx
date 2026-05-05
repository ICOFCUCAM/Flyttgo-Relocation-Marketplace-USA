import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../lib/store';
import type { PortalGate } from './types';

/**
 * Pre-portal screens shown when the driver hasn't reached the
 * "ready" gate yet (no application, pending review, rejected,
 * approved-but-no-driver-profile, suspended).
 */
export function PortalGateScreen({
  gate,
  subExpired,
  onOpenSubscription,
}: {
  gate: PortalGate;
  subExpired: boolean;
  onOpenSubscription: () => void;
}) {
  const { setPage } = useApp();
  const { t } = useTranslation();

  if (gate === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-6xl mx-auto px-4 animate-pulse">
          <div className="h-7 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                <div className="h-6 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
            {[0, 1, 2].map(i => (
              <div key={i} className="border-b border-gray-100 last:border-0 py-4">
                <div className="h-4 w-1/2 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-1/3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (gate === 'no-application') {
    return (
      <CenteredCard
        emojiBg="bg-blue-100"
        emoji="📋"
        title={t('driverPortal.notAppliedTitle')}
        body={t('driverPortal.notAppliedBody')}
        ctaLabel={t('driverPortal.startApplication')}
        ctaTone="primary"
        onCta={() => setPage('driver-onboarding')}
      />
    );
  }

  if (gate === 'application-pending' || gate === 'application-rejected') {
    const rejected = gate === 'application-rejected';
    return (
      <CenteredCard
        emojiBg={rejected ? 'bg-red-100' : 'bg-yellow-100'}
        emoji={rejected ? '❌' : '⏳'}
        title={rejected ? t('driverPortal.rejectedTitle') : t('driverPortal.pendingTitle')}
        body={rejected
          ? 'Check the review notes and re-upload updated documents on the status page.'
          : 'Our team usually reviews new driver applications within 24 hours.'}
        ctaLabel={t('driverPortal.viewStatus')}
        ctaTone="navy"
        onCta={() => setPage('driver-application-status')}
        borderClass={rejected ? 'border-red-100' : 'border-yellow-100'}
      />
    );
  }

  if (gate === 'no-driver-profile') {
    return (
      <CenteredCard
        emojiBg="bg-yellow-100"
        emoji="⏳"
        title={t('driverPortal.almostTitle')}
        body="Your application was approved but your driver profile is still being set up. This usually takes a few moments — try refreshing in a minute."
        ctaLabel="View status"
        ctaTone="primary"
        onCta={() => setPage('driver-application-status')}
      />
    );
  }

  if (gate === 'suspended') {
    return (
      <CenteredCard
        emojiBg="bg-red-100"
        emoji="🚫"
        title={t('driverPortal.suspendedTitle')}
        body={subExpired
          ? 'Your subscription has expired. Renew your plan to reactivate.'
          : 'Your account has been suspended. Please contact support.'}
        ctaLabel="View Subscription Plans"
        ctaTone="primary"
        onCta={onOpenSubscription}
        borderClass="border-red-100"
      />
    );
  }

  return null;
}

function CenteredCard({
  emojiBg, emoji, title, body, ctaLabel, ctaTone, onCta, borderClass = 'border-gray-100',
}: {
  emojiBg: string;
  emoji: string;
  title: string;
  body: React.ReactNode;
  ctaLabel: string;
  ctaTone: 'primary' | 'navy';
  onCta: () => void;
  borderClass?: string;
}) {
  const ctaClass = ctaTone === 'primary'
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : 'bg-[#0B2E59] hover:bg-[#1a4a8a]';
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl p-8 max-w-md text-center shadow-sm border ${borderClass}`}>
        <div className={`w-16 h-16 ${emojiBg} rounded-full flex items-center justify-center mx-auto mb-4 text-2xl`} aria-hidden="true">
          {emoji}
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 text-sm mb-6">{body}</p>
        <button
          onClick={onCta}
          className={`w-full py-3 ${ctaClass} text-white rounded-xl font-semibold transition ${FOCUS_RING}`}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { CustomerLegalAcceptance } from '../../LegalAcceptance';
import { formatAddress } from '../../../utils/formatAddress';
import type { StructuredAddress } from '../types';

export function ConfirmStep({
  pickupAddress,
  dropoffAddress,
  priceTotal,
  saving,
  legalAccepted,
  pricingReady,
  setLegalAccepted,
  onSubmit,
  error,
  user,
  onSignIn,
}: {
  pickupAddress:  StructuredAddress;
  dropoffAddress: StructuredAddress;
  priceTotal: number;
  saving: boolean;
  legalAccepted: boolean;
  pricingReady: boolean;
  setLegalAccepted: (v: boolean) => void;
  onSubmit: () => void;
  error: string;
  user: unknown;
  onSignIn: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('booking.legalTitle')}</h2>
        <p className="text-gray-500 text-sm mb-6">{t('booking.legalSubtitle')}</p>
        <CustomerLegalAcceptance onAccepted={setLegalAccepted} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-bold text-gray-900 text-lg">{t('booking.totalLabel')} {priceTotal.toFixed(0)} USD</p>
            <p className="text-gray-500 text-xs">{t('booking.escrowNote')}</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>{t('booking.summaryPickup')}: {formatAddress(pickupAddress).short}</p>
            <p>{t('booking.summaryDelivery')}: {formatAddress(dropoffAddress).short}</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">Booking failed</p>
            <p className="text-red-600 text-xs mt-1 break-words">{error}</p>
            {!user ? (
              <button
                type="button"
                onClick={onSignIn}
                className={`mt-3 px-4 py-2 bg-[#0B2E59] text-white rounded-lg text-xs font-semibold hover:bg-[#1a4a8a] transition ${FOCUS_RING}`}
              >
                Sign in to continue →
              </button>
            ) : (
              <p className="text-red-500 text-[10px] mt-2">
                Open DevTools (F12) → Console tab for the full error details.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || !legalAccepted || !pricingReady}
          className={`w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-base hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${FOCUS_RING}`}
        >
          {saving ? (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
              </svg>
              {t('booking.processing')}
            </>
          ) : !pricingReady ? (
            <>Calculating price…</>
          ) : (
            <>🔒 {t('booking.confirmPayBtn')} {priceTotal.toFixed(0)} USD</>
          )}
        </button>
        {!legalAccepted && (
          <p className="text-center text-xs text-red-500 mt-2">{t('booking.tickBoxes')}</p>
        )}
      </div>
    </div>
  );
}

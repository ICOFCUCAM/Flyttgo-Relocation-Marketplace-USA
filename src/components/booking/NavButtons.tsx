import React from 'react';
import { useTranslation } from 'react-i18next';
import { TOTAL_STEPS } from './types';

export function NavButtons({
  step,
  onBack,
  onNext,
}: {
  step: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between mt-8">
      <button
        type="button"
        onClick={onBack}
        className={`px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${
          step === 1 ? 'invisible' : ''
        }`}
      >
        ← {t('booking.navBack')}
      </button>
      {step < TOTAL_STEPS && (
        <button
          type="button"
          onClick={onNext}
          className="px-8 py-3 bg-[#0B2E59] text-white rounded-xl font-semibold hover:bg-[#0B2E59]/90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        >
          {t('booking.navContinue')} →
        </button>
      )}
    </div>
  );
}

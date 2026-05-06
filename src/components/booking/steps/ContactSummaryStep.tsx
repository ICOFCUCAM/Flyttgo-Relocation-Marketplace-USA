import { useTranslation } from 'react-i18next';
import { VAN_TYPES } from '../../../lib/constants';
import { formatAddress } from '../../../utils/formatAddress';
import type { StructuredAddress } from '../types';
import type { ServerPriceResult } from '../../../lib/calculatePrice';

export function ContactSummaryStep({
  name, setName,
  phone, setPhone,
  email, setEmail,
  notes, setNotes,
  pickupAddress, dropoffAddress,
  vanType, helpers,
  moveDate, moveTime,
  estimatedHours, distanceKm,
  pricingReady,
  basePrice, distanceCharge, helpersCharge, vatAmount, priceTotal,
  serverPrice,
}: {
  name: string;  setName:  (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  pickupAddress:  StructuredAddress;
  dropoffAddress: StructuredAddress;
  vanType: string;
  helpers: number;
  moveDate: string;
  moveTime: string;
  estimatedHours: number;
  distanceKm: number;
  pricingReady: boolean;
  basePrice: number;
  distanceCharge: number;
  helpersCharge: number;
  vatAmount: number;
  priceTotal: number;
  serverPrice: ServerPriceResult | null;
}) {
  const { t } = useTranslation();
  const pickupFmt  = formatAddress(pickupAddress);
  const dropoffFmt = formatAddress(dropoffAddress);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('booking.contactTitle')}</h2>
        <p className="text-gray-500 text-sm mb-6">{t('booking.contactSubtitle')}</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1.5">{t('booking.nameLabel')}</label>
            <input
              id="contact-name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2E59]/20 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 mb-1.5">{t('booking.phoneLabel')}</label>
              <input
                id="contact-phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 XXX XX XXX"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2E59]/20 outline-none"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1.5">{t('booking.emailLabel')}</label>
              <input
                id="contact-email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2E59]/20 outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="contact-notes" className="block text-sm font-medium text-gray-700 mb-1.5">{t('booking.notesLabel')}</label>
            <textarea
              id="contact-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={t('booking.notesPlaceholder')}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2E59]/20 outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Booking summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h3 className="font-bold text-gray-800 mb-4">{t('booking.summaryTitle')}</h3>
        <div className="space-y-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex gap-3 mb-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{t('booking.summaryPickup')}</p>
                {pickupFmt.line1 && <p className="font-medium text-gray-800">{pickupFmt.line1}</p>}
                {pickupFmt.line2 && <p className="text-gray-600">{pickupFmt.line2}</p>}
                <p className="text-gray-400 text-xs">the USA</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{t('booking.summaryDelivery')}</p>
                {dropoffFmt.line1 && <p className="font-medium text-gray-800">{dropoffFmt.line1}</p>}
                {dropoffFmt.line2 && <p className="text-gray-600">{dropoffFmt.line2}</p>}
                <p className="text-gray-400 text-xs">the USA</p>
              </div>
            </div>
          </div>

          {/* Vehicle banner — image + name + capacity. Surfaces the
           *  chosen vehicle prominently so the customer confirms they
           *  picked the right size before locking in the booking. */}
          {(() => {
            const v = VAN_TYPES.find(x => x.id === vanType);
            if (!v) return null;
            return (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-3">
                <div className="relative aspect-[16/8] overflow-hidden bg-slate-100">
                  <img
                    src={v.image}
                    alt={`${v.name} — ${v.capacity}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-baseline justify-between">
                    <span className="text-white font-bold text-sm drop-shadow">{v.name}</span>
                    <span className="text-white/95 text-xs font-semibold drop-shadow">${v.pricePerHour}/hr</span>
                  </div>
                </div>
                <div className="px-3 py-2 text-xs text-slate-600">
                  {v.capacity} · {v.payload}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">{t('booking.summaryVan')}</p>
              <p className="font-medium">{VAN_TYPES.find(v => v.id === vanType)?.name || t('booking.summaryTbd')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">{t('booking.summaryDate')}</p>
              <p className="font-medium">{moveDate || t('booking.summaryTbd')} {moveTime}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">{t('booking.summaryDuration')}</p>
              <p className="font-medium">{estimatedHours}{t('booking.summaryHoursEst')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">{t('booking.summaryDistance')}</p>
              <p className="font-medium">~{distanceKm} km</p>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            {!pricingReady ? (
              <p className="text-center text-xs text-gray-400 py-4">Calculating price…</p>
            ) : (
              <>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    {t('booking.priceBase')} ({estimatedHours}h × {VAN_TYPES.find(v => v.id === vanType)?.pricePerHour || 850} USD/h)
                  </span>
                  <span>{basePrice.toFixed(0)} USD</span>
                </div>
                {distanceCharge > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t('booking.priceDistance')}</span>
                    <span>{distanceCharge.toFixed(0)} USD</span>
                  </div>
                )}
                {helpersCharge > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t('booking.priceHelpers')} ({helpers})</span>
                    <span>{helpersCharge.toFixed(0)} USD</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t('booking.priceVat')}</span>
                  <span>{vatAmount.toFixed(0)} USD</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-2">
                  <span>{t('booking.priceTotal')}</span>
                  <span className="text-emerald-700">{priceTotal.toFixed(0)} USD</span>
                </div>
                <p className="text-[10px] text-gray-400 text-center pt-1">
                  {serverPrice
                    ? `Distance + price calculated server-side (${serverPrice.routing_provider})`
                    : 'Distance + price calculated in browser · will be re-verified server-side at submit'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import {
  CreditCard, Smartphone, Building2, Banknote, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import {
  selectPaymentMethods,
  type PaymentMethodSlug, type PaymentGatewaySlug,
} from '../../lib/payment-gateways';
import type { PricingCountry } from '../../lib/pricing-engine';
import { findCountryProfile } from '../../lib/country-profiles';
import { track } from '../../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <PaymentMethodPicker> — country-aware payment selection.
 *
 * Surfaces only the payment methods that are actually available in
 * the customer's country, ranked by gateway preference (Stripe in
 * structured markets; Paystack/Flutterwave/M-Pesa-direct in Africa;
 * Razorpay in India; PayPal as cross-border fallback).
 *
 * Fully controlled — pass `country` + `value` + `onChange`. The
 * component doesn't kick off the payment itself; that's the
 * checkout page's job. This keeps the picker reusable on /pricing
 * (transparency display) and at actual checkout.
 *
 * The icon map covers the canonical method slugs; unknown methods
 * fall through to a generic CreditCard icon.
 * ───────────────────────────────────────────────────────────────── */

const METHOD_ICON: Record<PaymentMethodSlug, LucideIcon> = {
  'card-visa':                 CreditCard,
  'card-mastercard':           CreditCard,
  'card-amex':                 CreditCard,
  'apple-pay':                 Smartphone,
  'google-pay':                Smartphone,
  'paypal':                    Smartphone,
  'mpesa':                     Smartphone,
  'flutterwave-bank-transfer': Building2,
  'paystack-bank-transfer':    Building2,
  'upi':                       Smartphone,
  'razorpay-netbanking':       Building2,
  'invoice':                   Banknote,
};

const GATEWAY_TONE: Record<PaymentGatewaySlug, string> = {
  stripe:        'bg-violet-50 text-violet-700',
  flutterwave:   'bg-orange-50 text-orange-700',
  paystack:      'bg-cyan-50 text-cyan-700',
  razorpay:      'bg-blue-50 text-blue-700',
  paypal:        'bg-blue-50 text-blue-700',
  'mpesa-direct': 'bg-emerald-50 text-emerald-700',
};

interface Props {
  country:        PricingCountry;
  /** Currently-selected method slug. Use the resolved list's first
   *  entry as the initial value when nothing is picked. */
  value?:         PaymentMethodSlug;
  onChange?:      (method: PaymentMethodSlug) => void;
  /** Compact = tighter padding for embedded use (e.g. on /pricing). */
  compact?:       boolean;
  /** When true, the picker is read-only (no onClick handlers). Used
   *  on /pricing where it's a transparency display. */
  readOnly?:      boolean;
}

export default function PaymentMethodPicker({
  country, value, onChange, compact = false, readOnly = false,
}: Props) {
  const methods = useMemo(() => selectPaymentMethods(country), [country]);
  const profile = findCountryProfile(country);

  const [hovered, setHovered] = useState<PaymentMethodSlug | null>(null);

  const padding = compact ? 'p-4' : 'p-5';

  if (methods.length === 0) {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-2xl ${padding}`}>
        <p className="text-sm text-amber-800">
          We don't have payment routing for this market yet. Pay-on-completion
          (cash) or corporate invoicing are available — reach out to
          partnerships@flyttgo.com for details.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl ${padding}`}>
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {profile.flag} {profile.name} · payment methods
        </p>
        <p className="text-[10px] text-slate-400 font-mono">{profile.currency}</p>
      </div>

      <ul className="space-y-1.5">
        {methods.map(({ method, gateway, isDefault }) => {
          const Icon     = METHOD_ICON[method.slug] ?? CreditCard;
          const selected = value === method.slug;
          const isActive = !readOnly && (selected || hovered === method.slug);
          return (
            <li key={`${method.slug}-${gateway.slug}`}>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => {
                  if (readOnly) return;
                  track('payment_method_picked', {
                    country, method: method.slug, gateway: gateway.slug,
                  });
                  onChange?.(method.slug);
                }}
                onMouseEnter={() => setHovered(method.slug)}
                onMouseLeave={() => setHovered(null)}
                aria-pressed={selected}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition border ${
                  selected
                    ? 'bg-emerald-50 border-emerald-400'
                    : isActive
                      ? 'bg-surface-soft border-slate-300'
                      : 'bg-white border-slate-100'
                } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Icon size={14} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-ink-900">{method.label}</span>
                    {isDefault && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">
                        Default
                      </span>
                    )}
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${GATEWAY_TONE[gateway.slug]}`}>
                      {gateway.name}
                    </span>
                  </div>
                  {method.note && (
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{method.note}</p>
                  )}
                </div>
                {selected && (
                  <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[10px] text-slate-500 leading-relaxed flex items-start gap-1.5">
        <ShieldCheck size={11} className="text-emerald-600 flex-shrink-0 mt-0.5" />
        Every gateway settles via FlyttGo escrow. Funds release to the provider
        after the move completes + the dispute window passes.
      </p>
    </div>
  );
}

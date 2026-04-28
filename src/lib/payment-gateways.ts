/* ─────────────────────────────────────────────────────────────────
 * Multi-gateway adaptive payments — country-aware payment routing.
 *
 * Different markets need different rails. The card-only Stripe-everywhere
 * posture leaves money on the table in Africa (Flutterwave / Paystack /
 * M-Pesa) and Asia (Razorpay / UPI). This module is the typed catalogue
 * the booking widget and the checkout page use to surface the right
 * payment methods per customer country.
 *
 * Architecture: each PaymentGateway has a `regions` predicate, a list
 * of supported methods, and a settlement model. selectGateway(country)
 * returns the ranked list of gateways available for that country —
 * the UI picks the top one as default and lets the customer switch.
 *
 * What this module does NOT do:
 *   - Actual SDK integration. Each gateway needs its own edge function
 *     (or extension of process-payment) with secret keys. Stripe is
 *     already wired; Flutterwave / Paystack / Razorpay / PayPal are
 *     follow-up work.
 *   - Currency conversion. We assume the gateway supports the local
 *     currency (true for the seeded combos).
 *
 * Data also seeded into Supabase via docs/install-payment-gateways.sql
 * so the engine can switch from curated → live with no code change.
 * ───────────────────────────────────────────────────────────────── */

import type { PricingCountry } from './pricing-engine';

export type PaymentGatewaySlug =
  | 'stripe'
  | 'flutterwave'
  | 'paystack'
  | 'razorpay'
  | 'paypal'
  | 'mpesa-direct';

export type PaymentMethodSlug =
  /* Card */
  | 'card-visa' | 'card-mastercard' | 'card-amex'
  /* Digital wallets */
  | 'apple-pay' | 'google-pay' | 'paypal'
  /* Regional */
  | 'mpesa' | 'flutterwave-bank-transfer' | 'paystack-bank-transfer'
  | 'upi' | 'razorpay-netbanking'
  /* Marketplace settlement */
  | 'invoice';        // corporate / monthly invoicing

export interface PaymentMethod {
  slug:        PaymentMethodSlug;
  label:       string;
  /** Which gateway routes this method. Multiple gateways may
   *  support the same method (e.g. card-visa via Stripe or
   *  Flutterwave) — we pick the first matching gateway in the
   *  country's ranked list. */
  gateway:     PaymentGatewaySlug;
  /** Optional UI hint shown next to the method. */
  note?:       string;
}

export interface PaymentGateway {
  slug:           PaymentGatewaySlug;
  name:           string;
  /** Marketing-safe blurb. */
  blurb:          string;
  /** Settlement model — escrow vs direct vs hybrid. */
  settlement:     'escrow' | 'direct' | 'hybrid';
  /** ISO currency codes the gateway settles natively. */
  supportsCurrencies: string[];
  /** Method slugs the gateway can route. */
  methods:        PaymentMethodSlug[];
}

/* ── Gateway catalogue ────────────────────────────────────────── */

export const PAYMENT_GATEWAYS: Record<PaymentGatewaySlug, PaymentGateway> = {
  stripe: {
    slug:        'stripe',
    name:        'Stripe',
    blurb:       'Card processing across US/EU/UK/Norway. Apple Pay + Google Pay built-in.',
    settlement:  'escrow',
    supportsCurrencies: ['USD','CAD','GBP','EUR','NOK','AED'],
    methods:     ['card-visa','card-mastercard','card-amex','apple-pay','google-pay'],
  },
  flutterwave: {
    slug:        'flutterwave',
    name:        'Flutterwave',
    blurb:       'Pan-African card + bank-transfer rails. Naira / Cedi / Shilling settlement.',
    settlement:  'escrow',
    supportsCurrencies: ['NGN','KES','USD'],
    methods:     ['card-visa','card-mastercard','flutterwave-bank-transfer','mpesa'],
  },
  paystack: {
    slug:        'paystack',
    name:        'Paystack',
    blurb:       'West-Africa-first. Card + USSD + bank transfer in NGN / GHS / ZAR.',
    settlement:  'escrow',
    supportsCurrencies: ['NGN','KES'],
    methods:     ['card-visa','card-mastercard','paystack-bank-transfer'],
  },
  razorpay: {
    slug:        'razorpay',
    name:        'Razorpay',
    blurb:       'India-native. UPI / netbanking / card / wallet.',
    settlement:  'escrow',
    supportsCurrencies: ['INR'],
    methods:     ['card-visa','card-mastercard','upi','razorpay-netbanking'],
  },
  paypal: {
    slug:        'paypal',
    name:        'PayPal',
    blurb:       'Global fallback for cross-border bookings + buyer protection.',
    settlement:  'escrow',
    supportsCurrencies: ['USD','EUR','GBP','CAD','AED'],
    methods:     ['paypal'],
  },
  /* Direct M-Pesa STK push when the customer prefers paying from the
   * Safaricom wallet without going through Flutterwave. Same
   * settlement model as escrow; M-Pesa-direct is preferred in KE
   * because the take rate is lower. */
  'mpesa-direct': {
    slug:        'mpesa-direct',
    name:        'M-Pesa (Daraja)',
    blurb:       'Safaricom Daraja STK push. Lowest take rate in Kenya.',
    settlement:  'escrow',
    supportsCurrencies: ['KES'],
    methods:     ['mpesa'],
  },
};

/* ── Country routing — gateways ranked by preference per country ── */

interface CountryRouting {
  country:        PricingCountry;
  /** Ordered list of gateways. First entry is the default tab in
   *  the checkout picker; the rest stack as alternatives. */
  gateways:       PaymentGatewaySlug[];
  /** Default fallback when the customer's chosen method isn't
   *  available in their region — usually 'invoice' for corporate
   *  fallback or the second-ranked gateway. */
  fallback:       PaymentMethodSlug;
}

export const COUNTRY_GATEWAY_ROUTING: CountryRouting[] = [
  /* Structured markets — Stripe primary, PayPal fallback. */
  { country: 'us', gateways: ['stripe','paypal'],          fallback: 'invoice' },
  { country: 'ca', gateways: ['stripe','paypal'],          fallback: 'invoice' },
  { country: 'gb', gateways: ['stripe','paypal'],          fallback: 'invoice' },
  { country: 'de', gateways: ['stripe','paypal'],          fallback: 'invoice' },
  { country: 'fr', gateways: ['stripe','paypal'],          fallback: 'invoice' },
  { country: 'no', gateways: ['stripe','paypal'],          fallback: 'invoice' },

  /* Africa — local rails first, Stripe USD as fallback for
   *           cross-border / tourist customers. */
  { country: 'ng', gateways: ['paystack','flutterwave','stripe'],         fallback: 'paystack-bank-transfer' },
  { country: 'ke', gateways: ['mpesa-direct','flutterwave','stripe'],     fallback: 'mpesa' },

  /* Middle East — Stripe (AED supported), PayPal cross-border. */
  { country: 'ae', gateways: ['stripe','paypal'],          fallback: 'invoice' },
];

/** Customer-facing payment-method option resolved for a given country. */
export interface ResolvedPaymentMethod {
  method:   PaymentMethod;
  gateway:  PaymentGateway;
  /** UI rank — lower = surface higher. */
  rank:     number;
  /** Whether this is the default selection for the country. */
  isDefault: boolean;
}

/**
 * Return the ordered list of payment methods available for a given
 * country. Default flag set on the first method of the first gateway.
 *
 * The booking widget + PaymentPage call this to render the picker;
 * options outside the country's routing list never surface.
 */
export function selectPaymentMethods(country: PricingCountry): ResolvedPaymentMethod[] {
  const routing = COUNTRY_GATEWAY_ROUTING.find(r => r.country === country);
  if (!routing) return [];

  const out: ResolvedPaymentMethod[] = [];
  let rank = 0;

  for (const gatewaySlug of routing.gateways) {
    const gateway = PAYMENT_GATEWAYS[gatewaySlug];
    for (const methodSlug of gateway.methods) {
      out.push({
        method: {
          slug:    methodSlug,
          label:   methodLabel(methodSlug),
          gateway: gatewaySlug,
        },
        gateway,
        rank,
        isDefault: rank === 0,
      });
      rank += 1;
    }
  }

  /* Append corporate invoicing as a final option in every market —
   * dispatched into the Corporate dashboard if selected. */
  out.push({
    method: { slug: 'invoice', label: 'Corporate invoice', gateway: 'stripe',
              note: 'Monthly invoicing for verified corporate accounts.' },
    gateway: PAYMENT_GATEWAYS.stripe,
    rank,
    isDefault: false,
  });

  return out;
}

function methodLabel(slug: PaymentMethodSlug): string {
  switch (slug) {
    case 'card-visa':                  return 'Visa';
    case 'card-mastercard':            return 'Mastercard';
    case 'card-amex':                  return 'American Express';
    case 'apple-pay':                  return 'Apple Pay';
    case 'google-pay':                 return 'Google Pay';
    case 'paypal':                     return 'PayPal';
    case 'mpesa':                      return 'M-Pesa (STK push)';
    case 'flutterwave-bank-transfer':  return 'Bank transfer · Flutterwave';
    case 'paystack-bank-transfer':     return 'Bank transfer · Paystack';
    case 'upi':                        return 'UPI';
    case 'razorpay-netbanking':        return 'Net banking · Razorpay';
    case 'invoice':                    return 'Corporate invoice';
  }
}

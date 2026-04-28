import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Banknote, CreditCard, MapPin, Clock, Info, Bookmark, Tag, Check, X as XIcon, ArrowDownUp, Leaf } from 'lucide-react';

/* Lazy-loaded so the ~150 KB Leaflet bundle only ships once the
 * customer has picked both addresses (Wave 23). */
const RoutePreviewMap = lazy(() => import('./RoutePreviewMap'));
import { toast } from 'sonner';
import { useApp } from '../../lib/store';
import type { BookingCountry, PaymentMethod } from '../../lib/store';
import NorwayAddressAutocomplete, { USAddress } from '../NorwayAddressAutocomplete';
import { COUNTRY_PAYMENT, formatCurrency, splitPayment } from '../../lib/constants';
import { getRouteDistance, haversineKm, RouteResult } from '../../lib/routing';
import { track } from '../../lib/analytics';
import { saveQuote } from '../../lib/saved-quotes-store';
import { applyPromo, type PromoCode } from '../../lib/promo-codes';

const COUNTRY_LABEL: Record<BookingCountry, string> = {
  us: 'USA',
  ca: 'Canada',
  de: 'Germany',
  fr: 'France',
  gb: 'United Kingdom',
  no: 'Norway',
};

const COUNTRY_PLACEHOLDER_PICKUP: Record<BookingCountry, string> = {
  us: 'Pickup address — e.g. 350 5th Ave, New York, NY',
  ca: 'Pickup address — e.g. 290 Bremner Blvd, Toronto, ON',
  de: 'Abholadresse — z. B. Friedrichstraße 100, Berlin',
  fr: 'Adresse de prise en charge — ex. 12 rue de Rivoli, Paris',
  gb: 'Pickup address — e.g. 32 Old Broad St, London',
  no: 'Henteadresse — f.eks. Karl Johans gate 22, Oslo',
};

const COUNTRY_PLACEHOLDER_DROPOFF: Record<BookingCountry, string> = {
  us: 'Drop-off address — anywhere in the USA',
  ca: 'Drop-off address — anywhere in Canada',
  de: 'Lieferadresse — überall in Deutschland',
  fr: 'Adresse de livraison — partout en France',
  gb: 'Drop-off address — anywhere in the UK',
  no: 'Leveringsadresse — hvor som helst i Norge',
};

const COUNTRY_HEADLINE: Record<BookingCountry, string> = {
  us: 'Get a quote for your move in the United States',
  ca: 'Get a quote for your move in Canada',
  de: 'Angebot für Ihren Umzug in Deutschland anfordern',
  fr: 'Obtenez un devis pour votre déménagement en France',
  gb: 'Get a quote for your move in the United Kingdom',
  no: 'Få et tilbud for din flytting i Norge',
};

const COUNTRY_CTA: Record<BookingCountry, string> = {
  us: 'Get my quote',
  ca: 'Get my quote',
  de: 'Angebot anfordern',
  fr: 'Voir mon devis',
  gb: 'Get my quote',
  no: 'Hent tilbud',
};

const FIELD_LABELS: Record<BookingCountry, { pickup: string; dropoff: string; date: string }> = {
  us: { pickup: 'Pickup address',     dropoff: 'Drop-off address',  date: 'Move date' },
  ca: { pickup: 'Pickup address',     dropoff: 'Drop-off address',  date: 'Move date' },
  de: { pickup: 'Abholadresse',       dropoff: 'Lieferadresse',     date: 'Umzugsdatum' },
  fr: { pickup: 'Adresse de départ',  dropoff: 'Adresse d’arrivée', date: 'Date de déménagement' },
  gb: { pickup: 'Pickup address',     dropoff: 'Drop-off address',  date: 'Move date' },
  no: { pickup: 'Henteadresse',       dropoff: 'Leveringsadresse',  date: 'Flyttedato' },
};

const PAY_LABELS: Record<BookingCountry, {
  fullCard:    string;
  cashSplit:   string;
  payNow:      string;
  payLater:    string;
  estimateAt:  string;
  byRoad:      string;
  asTheCrowFlies: string;
  estimating:  string;
}> = {
  us: { fullCard: 'Pay full online (card)',         cashSplit: 'Pay 30% online + cash on delivery',           payNow: 'Pay now',     payLater: 'Cash on delivery', estimateAt: 'Estimate based on distance',  byRoad: 'By road',         asTheCrowFlies: 'Straight-line', estimating: 'Estimating distance…' },
  ca: { fullCard: 'Pay full online (card)',         cashSplit: 'Pay 30% online + cash on delivery',           payNow: 'Pay now',     payLater: 'Cash on delivery', estimateAt: 'Estimate based on distance',  byRoad: 'By road',         asTheCrowFlies: 'Straight-line', estimating: 'Estimating distance…' },
  de: { fullCard: 'Komplett online zahlen (Karte)', cashSplit: '30 % online + Restbetrag bar bei Lieferung',  payNow: 'Jetzt zahlen', payLater: 'Bar bei Lieferung', estimateAt: 'Schätzung anhand der Entfernung', byRoad: 'Straße', asTheCrowFlies: 'Luftlinie', estimating: 'Entfernung wird berechnet…' },
  fr: { fullCard: 'Payer en ligne (carte)',         cashSplit: '30 % en ligne + espèces à la livraison',      payNow: 'Payer maintenant', payLater: 'Espèces à la livraison', estimateAt: 'Estimation basée sur la distance', byRoad: 'Par la route', asTheCrowFlies: 'À vol d’oiseau', estimating: 'Calcul de la distance…' },
  gb: { fullCard: 'Pay full online (card)',         cashSplit: 'Pay 30% online + cash on delivery',           payNow: 'Pay now',     payLater: 'Cash on delivery', estimateAt: 'Estimate based on distance',  byRoad: 'By road',         asTheCrowFlies: 'Straight-line', estimating: 'Estimating distance…' },
  no: { fullCard: 'Betal alt på nett (kort)',       cashSplit: '30 % på nett + resten kontant ved levering',  payNow: 'Betal nå',    payLater: 'Kontant ved levering', estimateAt: 'Estimat basert på avstand', byRoad: 'Vei', asTheCrowFlies: 'Luftlinje', estimating: 'Beregner avstand…' },
};

interface Props {
  country: BookingCountry;
  /** Compact variant for inline placement on long pages. Default false. */
  compact?: boolean;
}

/* Indicative per-mile/km coefficient for the in-widget price preview.
 * The booking flow runs the canonical calculator from constants.ts and
 * the calculate-price edge function — this preview only needs to be in
 * the right ballpark so the customer sees a number on the cash split. */
const INDICATIVE_BASE_PER_BOOKING: Record<BookingCountry, number> = {
  us: 380, ca: 420, gb: 320, de: 360, fr: 380, no: 3200,
};
const INDICATIVE_PER_KM: Record<BookingCountry, number> = {
  us: 1.4, ca: 1.5, gb: 1.3, de: 1.3, fr: 1.4, no: 12,
};

function indicativeTotal(country: BookingCountry, distanceKm: number | null): number {
  const base = INDICATIVE_BASE_PER_BOOKING[country];
  const perKm = INDICATIVE_PER_KM[country];
  return Math.round(base + Math.max(0, distanceKm ?? 0) * perKm);
}

function promoErrorMessage(reason: 'unknown' | 'expired' | 'wrong_country' | 'min_total'): string {
  switch (reason) {
    case 'expired':       return "This code has expired.";
    case 'wrong_country': return "This code isn't valid in this market.";
    case 'min_total':     return "This code requires a higher booking total.";
    case 'unknown':
    default:              return "We don't recognise that code.";
  }
}

/**
 * Country-scoped shopfront booking widget with two payment options
 * (full-card or 30% online + 70% cash on delivery) and a dual
 * distance preview (OSRM road distance + Haversine straight-line).
 *
 * The cash option is hidden in markets where COUNTRY_PAYMENT.cashEnabled
 * is false — see lib/constants.ts.
 */
export default function BookingShortcut({ country, compact = false }: Props) {
  const { setBookingData, setPage } = useApp();
  const [pickup,  setPickup]    = useState<USAddress | null>(null);
  const [dropoff, setDropoff]   = useState<USAddress | null>(null);
  const [moveDate, setMoveDate] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* Swap counter — bumped each time the customer presses the swap
   * button. We use it as part of the autocomplete key so the inputs
   * re-mount with the swapped initial values (NorwayAddressAutocomplete
   * only seeds query from `value` on mount). */
  const [swapCount, setSwapCount] = useState(0);

  function swapAddresses() {
    if (!pickup && !dropoff) return;
    setPickup(dropoff);
    setDropoff(pickup);
    setSwapCount(c => c + 1);
    track('booking_shortcut_addresses_swapped', { country });
  }

  /* Promo state. The applied code is the one we've validated; the
   * input is the raw text the customer is currently typing. */
  const [promoInput,    setPromoInput]    = useState('');
  const [promoOpen,     setPromoOpen]     = useState(false);
  const [promoApplied,  setPromoApplied]  = useState<PromoCode | null>(null);
  const [promoError,    setPromoError]    = useState<string | null>(null);

  /* ── Two distance systems, both displayed for transparency ──
   * 1) OSRM via getRouteDistance — real road distance + ETA
   * 2) Haversine — straight-line "as the crow flies"
   * The booking total is computed off the OSRM number (or the
   * Haversine fallback when OSRM is unreachable); the second
   * number is shown for context so customers can see we're being
   * honest about the routing. */
  const [route,         setRoute]         = useState<RouteResult | null>(null);
  const [routeLoading,  setRouteLoading]  = useState(false);
  const straightLineKm =
    pickup?.lat != null && dropoff?.lat != null && pickup.lng != null && dropoff.lng != null
      ? Math.round(haversineKm({ lat: pickup.lat, lng: pickup.lng }, { lat: dropoff.lat, lng: dropoff.lng }) * 10) / 10
      : null;

  useEffect(() => {
    let cancelled = false;
    if (pickup?.lat == null || pickup?.lng == null || dropoff?.lat == null || dropoff?.lng == null) {
      setRoute(null);
      return;
    }
    setRouteLoading(true);
    (async () => {
      const r = await getRouteDistance(
        { lat: pickup.lat!, lng: pickup.lng! },
        { lat: dropoff.lat!, lng: dropoff.lng! },
      );
      if (cancelled) return;
      setRoute(r);
      setRouteLoading(false);
    })();
    return () => { cancelled = true; };
  }, [pickup, dropoff]);

  const labels  = FIELD_LABELS[country];
  const payL    = PAY_LABELS[country];
  const policy  = COUNTRY_PAYMENT[country];

  /* Live indicative total + cash-method split. The split below always
   * uses 'card_deposit_cash' so the customer sees the 30/70 breakdown
   * without having to click anything; the actual booking is created
   * with whichever button (Pay full or Cash) the customer presses. */
  const grossIndicative = pickup && dropoff ? indicativeTotal(country, route?.distanceKm ?? straightLineKm) : null;
  /* Apply promo discount to the indicative total before it flows
   * into splitPayment() — this keeps the deposit/cashDue split
   * accurate when a code is active. */
  const promoDiscountAmount = grossIndicative != null && promoApplied
    ? Math.round(grossIndicative * promoApplied.pct)
    : 0;
  const indicative = grossIndicative != null ? grossIndicative - promoDiscountAmount : null;
  const split = indicative != null ? splitPayment(indicative, country, 'card_deposit_cash') : null;

  /* If the customer changes country / clears addresses while a promo
   * is applied, re-validate against the new context. The most common
   * case is a country chip switch in the QuickQuoteDrawer — a
   * country-scoped code may no longer apply. */
  useEffect(() => {
    if (!promoApplied) return;
    const result = applyPromo(promoApplied.code, country, grossIndicative);
    if (result.ok === false) {
      setPromoApplied(null);
      setPromoError(promoErrorMessage(result.reason));
    }
  }, [country, grossIndicative, promoApplied]);

  function handleApplyPromo() {
    const result = applyPromo(promoInput, country, grossIndicative);
    if (result.ok === false) {
      setPromoApplied(null);
      setPromoError(promoErrorMessage(result.reason));
      track('promo_code_rejected', { code: promoInput.toUpperCase(), reason: result.reason, country });
      return;
    }
    setPromoApplied(result.code);
    setPromoError(null);
    setPromoInput('');
    track('promo_code_applied', { code: result.code.code, pct: result.code.pct, country });
    toast.success(`${result.code.code} applied`, {
      description: result.code.label,
    });
  }

  function handleRemovePromo() {
    if (promoApplied) track('promo_code_removed', { code: promoApplied.code, country });
    setPromoApplied(null);
    setPromoError(null);
  }

  /**
   * VanMan-UK two-button submit pattern: a primary "Pay £X" button
   * (card-full) and a secondary "Cash" button (30% deposit + 70% cash
   * on delivery). Both create the booking and navigate to /book —
   * the only difference is the paymentMethod stored on bookingData,
   * which the payment step then routes through Stripe accordingly.
   */
  function submit(method: PaymentMethod) {
    if (!pickup || !dropoff) {
      setSubmitError('Please pick a pickup and a drop-off address.');
      return;
    }
    setSubmitError(null);

    const finalSplit = indicative != null
      ? splitPayment(indicative, country, method)
      : { deposit: 0, cashDue: 0 };

    setBookingData({
      country,
      pickupAddress:  pickup.formatted,
      pickupLat:      pickup.lat,
      pickupLng:      pickup.lng,
      pickupPostcode: pickup.postcode,
      pickupCity:     pickup.city,
      pickupAddressData: {
        street_name:  pickup.street_name,
        house_number: pickup.house_number,
        postcode:     pickup.postcode,
        city:         pickup.city,
        country:      COUNTRY_LABEL[country],
        lat:          pickup.lat,
        lng:          pickup.lng,
        formatted:    pickup.formatted,
      },
      dropoffAddress:  dropoff.formatted,
      dropoffLat:      dropoff.lat,
      dropoffLng:      dropoff.lng,
      dropoffPostcode: dropoff.postcode,
      dropoffCity:     dropoff.city,
      dropoffAddressData: {
        street_name:  dropoff.street_name,
        house_number: dropoff.house_number,
        postcode:     dropoff.postcode,
        city:         dropoff.city,
        country:      COUNTRY_LABEL[country],
        lat:          dropoff.lat,
        lng:          dropoff.lng,
        formatted:    dropoff.formatted,
      },
      moveDate,
      paymentMethod: method,
      depositAmount: finalSplit.deposit,
      cashDueAmount: finalSplit.cashDue,
      distanceKm:      route?.distanceKm    ?? straightLineKm ?? null,
      durationMinutes: route?.durationMinutes ?? null,
      promoCode:       promoApplied?.code,
      promoDiscountPct: promoApplied?.pct,
      step: 2,
    });

    track('booking_shortcut_submitted', {
      country,
      paymentMethod:   method,
      indicativeTotal: indicative,
      depositAmount:   finalSplit.deposit,
      cashDueAmount:   finalSplit.cashDue,
      distanceKm:      route?.distanceKm ?? straightLineKm,
      hasMoveDate:     Boolean(moveDate),
      promoCode:       promoApplied?.code,
    });

    setPage('booking');
  }

  /* "Save quote" — lets the customer bookmark the brief without
   * jumping into the booking flow. Persisted to localStorage via
   * saved-quotes-store; surfaced on MyBookings under "Saved quotes". */
  function handleSave() {
    if (!pickup || !dropoff || indicative == null) {
      toast.error('Pick a pickup and a drop-off address first', {
        description: 'We need both ends of the route to save the quote.',
      });
      return;
    }
    setSubmitError(null);
    saveQuote({
      country,
      pickupAddress:   pickup.formatted,
      dropoffAddress:  dropoff.formatted,
      moveDate:        moveDate || undefined,
      paymentMethod:   'card_full',
      indicativeTotal: indicative,
      depositAmount:   split?.deposit ?? indicative,
      cashDueAmount:   split?.cashDue ?? 0,
      distanceKm:      route?.distanceKm    ?? straightLineKm ?? null,
      durationMinutes: route?.durationMinutes ?? null,
    });
    track('quote_saved', { country, indicativeTotal: indicative });
    toast.success('Quote saved', {
      description: `${formatCurrency(indicative, country)} · find it on My Bookings.`,
      action: { label: 'Open', onClick: () => setPage('my-bookings') },
    });
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit('card_full'); }}
      className={`bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 ${
        compact ? 'p-5' : 'p-6 lg:p-8'
      }`}
    >
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-2">
          Get an instant quote
        </p>
        <h3 className={`tracking-tight text-slate-900 font-extrabold ${
          compact ? 'text-xl' : 'text-2xl lg:text-3xl'
        }`}>
          {COUNTRY_HEADLINE[country]}
        </h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <NorwayAddressAutocomplete
            key={`pickup-${country}-${swapCount}`}
            id={`shortcut-pickup-${country}`}
            label={labels.pickup}
            value={pickup?.formatted ?? ''}
            placeholder={COUNTRY_PLACEHOLDER_PICKUP[country]}
            countryCode={country}
            required
            onSelect={setPickup}
          />

          {/* Swap addresses (Wave 33). Disabled until at least one
              address is set, so it doesn't render as a no-op affordance. */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={swapAddresses}
              disabled={!pickup && !dropoff}
              aria-label="Swap pickup and drop-off addresses"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-700 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ArrowDownUp size={11} />
              Swap
            </button>
          </div>

          <NorwayAddressAutocomplete
            key={`dropoff-${country}-${swapCount}`}
            id={`shortcut-dropoff-${country}`}
            label={labels.dropoff}
            value={dropoff?.formatted ?? ''}
            placeholder={COUNTRY_PLACEHOLDER_DROPOFF[country]}
            countryCode={country}
            required
            onSelect={setDropoff}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{labels.date}</label>
          <input
            type="date"
            value={moveDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={e => setMoveDate(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white"
          />
        </div>
      </div>

      {/* ── Inline route preview map (Wave 23) ───────────────────
          Renders only once both endpoints have coordinates so the
          Leaflet bundle stays out of the first paint. */}
      {pickup?.lat != null && pickup?.lng != null && dropoff?.lat != null && dropoff?.lng != null && (
        <Suspense fallback={<div className="mt-4 h-44 rounded-xl bg-slate-100 border border-slate-200 animate-pulse" />}>
          <RoutePreviewMap
            pickup={{  lat: pickup.lat,  lng: pickup.lng  }}
            dropoff={{ lat: dropoff.lat, lng: dropoff.lng }}
          />
        </Suspense>
      )}

      {/* ── Distance preview ───────────────────────────────────── */}
      {(pickup && dropoff) && (
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
          {routeLoading && <span className="text-slate-500">{payL.estimating}</span>}
          {!routeLoading && (
            <div className="flex items-center gap-3 flex-wrap text-slate-700">
              {route && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={12} className="text-amber-600" />
                  <strong className="text-slate-900">{payL.byRoad}</strong>
                  · {route.distanceKm} km
                  {route.durationMinutes != null && (
                    <>
                      <span className="mx-1">·</span>
                      <Clock size={12} className="text-slate-400" />
                      {Math.floor(route.durationMinutes / 60)}h {route.durationMinutes % 60}m
                    </>
                  )}
                </span>
              )}
              {straightLineKm != null && (
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <span className="mx-1">·</span>
                  <strong>{payL.asTheCrowFlies}</strong> · {straightLineKm} km
                </span>
              )}
              {/* Estimated CO₂e (Wave 33). 0.25 kg/km is a common
                  industry figure for a 2.5-tonne panel van; the
                  CarbonOffset section on the home page expands on
                  the offset programme. */}
              {(route?.distanceKm ?? straightLineKm) != null && (
                <span
                  className="inline-flex items-center gap-1.5 text-emerald-700 ml-auto"
                  title="Estimated CO₂e for a 2.5-tonne panel van. Offset is included on every Elite-tier booking."
                >
                  <Leaf size={12} className="text-emerald-600" />
                  ~{Math.round(((route?.distanceKm ?? straightLineKm)! * 0.25))} kg CO₂e
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Indicative total + cash split breakdown ──────────────── */}
      {indicative != null && grossIndicative != null && (
        <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
            <div className="min-w-0">
              <span className="text-sm text-slate-600 block">Estimated total</span>
              {promoApplied && promoDiscountAmount > 0 && (
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider inline-flex items-center gap-1 mt-0.5">
                  <Tag size={10} />
                  {promoApplied.code} · −{Math.round(promoApplied.pct * 100)}%
                </span>
              )}
            </div>
            <div className="text-right">
              {promoApplied && promoDiscountAmount > 0 && (
                <span className="text-xs text-slate-400 line-through block">
                  {formatCurrency(grossIndicative, country)}
                </span>
              )}
              <span className="text-lg font-extrabold text-slate-900">{formatCurrency(indicative, country)}</span>
            </div>
          </div>
          {policy.cashEnabled && split && (
            <div className="grid grid-cols-2 divide-x divide-slate-100 text-xs">
              <div className="px-3 py-2 flex items-center gap-1.5">
                <CreditCard size={12} className="text-slate-500" />
                <div>
                  <p className="text-slate-500">{payL.payNow}</p>
                  <p className="font-bold text-slate-900">{formatCurrency(split.deposit, country)}</p>
                </div>
              </div>
              <div className="px-3 py-2 flex items-center gap-1.5">
                <Banknote size={12} className="text-emerald-600" />
                <div>
                  <p className="text-slate-500">{payL.payLater}</p>
                  <p className="font-bold text-slate-900">{formatCurrency(split.cashDue, country)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!policy.cashEnabled && (
        <p className="mt-3 text-[11px] text-slate-500 flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 flex-shrink-0 text-slate-400" />
          Cash on delivery isn’t available in {COUNTRY_LABEL[country]} yet.
        </p>
      )}

      {/* ── Promo code (Wave 26) ─────────────────────────────────── */}
      <div className="mt-3">
        {promoApplied ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
              <Check size={12} />
              {promoApplied.code} · {promoApplied.label}
            </span>
            <button
              type="button"
              onClick={handleRemovePromo}
              aria-label="Remove promo code"
              className="text-emerald-700/70 hover:text-emerald-900 inline-flex items-center gap-1"
            >
              <XIcon size={12} />
              Remove
            </button>
          </div>
        ) : promoOpen ? (
          <div>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 bg-white text-xs">
                <Tag size={12} className="text-slate-400" />
                <input
                  type="text"
                  value={promoInput}
                  onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyPromo(); } }}
                  placeholder="Enter code (e.g. WELCOME10)"
                  spellCheck={false}
                  autoCapitalize="characters"
                  className="flex-1 bg-transparent outline-none uppercase tracking-wider"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyPromo}
                disabled={!promoInput.trim()}
                className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
              >
                Apply
              </button>
            </div>
            {promoError && (
              <p className="mt-1.5 text-[11px] text-red-600 inline-flex items-center gap-1">
                <Info size={11} />
                {promoError}
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPromoOpen(true)}
            className="text-xs text-slate-500 hover:text-amber-700 inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
          >
            <Tag size={12} />
            Have a promo code?
          </button>
        )}
      </div>

      {submitError && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {submitError}
        </div>
      )}

      {/* ── VanMan-UK two-button submit row ──────────────────────── */}
      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl transition shadow-lg shadow-amber-500/30"
        >
          <CreditCard size={16} />
          {indicative != null
            ? `Pay ${formatCurrency(indicative, country)}`
            : COUNTRY_CTA[country]}
        </button>
        {policy.cashEnabled && (
          <button
            type="button"
            onClick={() => submit('card_deposit_cash')}
            className="px-4 py-3.5 inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition"
            title={split ? `${formatCurrency(split.deposit, country)} now · ${formatCurrency(split.cashDue, country)} cash on delivery` : undefined}
          >
            <Banknote size={16} />
            {payL.payLater === 'Cash on delivery' ? 'Cash' : payL.payLater}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!pickup || !dropoff || indicative == null}
        className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-300 text-slate-600 hover:border-slate-900 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-base ease-marketplace"
      >
        <Bookmark size={14} />
        Save this quote for later
      </button>

      <p className="mt-3 text-xs text-slate-500 text-center flex items-center justify-center gap-2 flex-wrap">
        <span>★ 4.8 average</span>
        <span>·</span>
        <span>Licensed providers</span>
        <span>·</span>
        <span>Escrow protected</span>
      </p>
    </form>
  );
}

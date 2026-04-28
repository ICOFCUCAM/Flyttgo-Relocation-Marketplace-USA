import React, { useEffect, useState } from 'react';
import { Banknote, CreditCard, MapPin, Clock, Info } from 'lucide-react';
import { useApp } from '../../lib/store';
import type { BookingCountry, PaymentMethod } from '../../lib/store';
import NorwayAddressAutocomplete, { USAddress } from '../NorwayAddressAutocomplete';
import { COUNTRY_PAYMENT, formatCurrency, splitPayment } from '../../lib/constants';
import { getRouteDistance, haversineKm, RouteResult } from '../../lib/routing';

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card_full');

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

  /* If the country has cash disabled, force the toggle to card-only
   * regardless of any earlier state from another country. */
  useEffect(() => {
    if (!policy.cashEnabled && paymentMethod === 'card_deposit_cash') {
      setPaymentMethod('card_full');
    }
  }, [policy.cashEnabled, paymentMethod]);

  /* Live indicative total + payment split. Cleared until both
   * addresses are picked. */
  const indicative = pickup && dropoff ? indicativeTotal(country, route?.distanceKm ?? straightLineKm) : null;
  const split = indicative != null ? splitPayment(indicative, country, paymentMethod) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickup || !dropoff) {
      setSubmitError('Please pick a pickup and a drop-off address.');
      return;
    }
    setSubmitError(null);

    /* Final split from the canonical helper so the booking flow
     * inherits the same numbers the customer just saw. */
    const finalSplit = indicative != null
      ? splitPayment(indicative, country, paymentMethod)
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
      paymentMethod,
      depositAmount: finalSplit.deposit,
      cashDueAmount: finalSplit.cashDue,
      distanceKm:      route?.distanceKm    ?? straightLineKm ?? null,
      durationMinutes: route?.durationMinutes ?? null,
      step: 2,
    });
    setPage('booking');
  }

  return (
    <form
      onSubmit={handleSubmit}
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
        <NorwayAddressAutocomplete
          id={`shortcut-pickup-${country}`}
          label={labels.pickup}
          value={pickup?.formatted ?? ''}
          placeholder={COUNTRY_PLACEHOLDER_PICKUP[country]}
          countryCode={country}
          required
          onSelect={setPickup}
        />
        <NorwayAddressAutocomplete
          id={`shortcut-dropoff-${country}`}
          label={labels.dropoff}
          value={dropoff?.formatted ?? ''}
          placeholder={COUNTRY_PLACEHOLDER_DROPOFF[country]}
          countryCode={country}
          required
          onSelect={setDropoff}
        />
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
            </div>
          )}
        </div>
      )}

      {/* ── Payment method toggle ──────────────────────────────── */}
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => setPaymentMethod('card_full')}
          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition ${
            paymentMethod === 'card_full'
              ? 'border-amber-400 bg-amber-50'
              : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <CreditCard size={18} className={paymentMethod === 'card_full' ? 'text-amber-600 mt-0.5' : 'text-slate-400 mt-0.5'} />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">{payL.fullCard}</p>
            {indicative != null && (
              <p className="text-xs text-slate-600 mt-0.5">
                {payL.payNow}: <strong>{formatCurrency(indicative, country)}</strong>
              </p>
            )}
          </div>
        </button>

        {policy.cashEnabled && (
          <button
            type="button"
            onClick={() => setPaymentMethod('card_deposit_cash')}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition ${
              paymentMethod === 'card_deposit_cash'
                ? 'border-amber-400 bg-amber-50'
                : 'border-slate-200 hover:border-amber-300'
            }`}
          >
            <Banknote size={18} className={paymentMethod === 'card_deposit_cash' ? 'text-amber-600 mt-0.5' : 'text-slate-400 mt-0.5'} />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">{payL.cashSplit}</p>
              {split && indicative != null && paymentMethod === 'card_deposit_cash' && (
                <p className="text-xs text-slate-600 mt-0.5">
                  {payL.payNow}: <strong>{formatCurrency(split.deposit, country)}</strong>
                  <span className="mx-1">·</span>
                  {payL.payLater}: <strong>{formatCurrency(split.cashDue, country)}</strong>
                </p>
              )}
              {split && indicative != null && paymentMethod !== 'card_deposit_cash' && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {policy.depositPct}% {payL.payNow.toLowerCase()} · {policy.cashOnDeliveryPct}% {payL.payLater.toLowerCase()}
                </p>
              )}
            </div>
          </button>
        )}
      </div>

      {!policy.cashEnabled && (
        <p className="mt-2 text-[11px] text-slate-500 flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 flex-shrink-0 text-slate-400" />
          Cash on delivery isn’t available in {COUNTRY_LABEL[country]} yet.
        </p>
      )}

      {submitError && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        className="mt-5 w-full px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl transition shadow-lg shadow-amber-500/30"
      >
        {COUNTRY_CTA[country]}
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

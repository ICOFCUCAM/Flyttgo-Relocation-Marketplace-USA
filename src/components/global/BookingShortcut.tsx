import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import type { BookingCountry } from '../../lib/store';
import NorwayAddressAutocomplete, { USAddress } from '../NorwayAddressAutocomplete';

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

interface Props {
  country: BookingCountry;
  /** Compact variant for inline placement on long pages. Default false. */
  compact?: boolean;
}

/**
 * Country-scoped shopfront booking widget.
 *
 * Three-field form (pickup / drop-off / move date) that mirrors the
 * inputs the existing BookingFlow opens on, with the difference that
 * every input here is restricted to the selected national marketplace.
 * Address autocomplete uses Nominatim with `countrycodes=<iso>` and
 * the `country` field on the resulting address is set to the country's
 * label, so BookingFlow can pre-fill its own state without re-typing.
 *
 * "Get a quote" hands the structured pickup + drop-off + move date
 * over to the global BookingData store, sets `country = <iso>`, and
 * navigates to /book — which is the existing 6-step BookingFlow.
 */
export default function BookingShortcut({ country, compact = false }: Props) {
  const { setBookingData, setPage } = useApp();
  const [pickup, setPickup]   = useState<USAddress | null>(null);
  const [dropoff, setDropoff] = useState<USAddress | null>(null);
  const [moveDate, setMoveDate] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const labels = FIELD_LABELS[country];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickup || !dropoff) {
      setSubmitError('Please pick a pickup and a drop-off address.');
      return;
    }
    setSubmitError(null);

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
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700 mb-2">
          {country.toUpperCase()} · Marketplace booking
        </p>
        <h3 className={`font-serif tracking-tight text-slate-900 ${
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
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
          />
        </div>
      </div>

      {submitError && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        className="mt-5 w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-600/25"
      >
        {COUNTRY_CTA[country]}
      </button>
      <p className="mt-3 text-xs text-slate-500 text-center">
        Independent licensed providers · Transparent pricing · Escrow on every booking
      </p>
    </form>
  );
}

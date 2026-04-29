import React from 'react';
import { useTranslation } from 'react-i18next';
import NorwayAddressAutocomplete, { type USAddress, type CountryCode } from '../../NorwayAddressAutocomplete';
import { formatNorwegianAddress } from '../../../utils/formatNorwegianAddress';
import type { StructuredAddress, AddressErrors } from '../types';
import type { RouteResult } from '../../../lib/routing';
import type { ServerPriceResult } from '../../../lib/calculatePrice';

export function AddressesStep({
  country,
  countryLabel,
  pickupAddress,
  dropoffAddress,
  setPickupAddress,
  setDropoffAddress,
  addressErrors,
  setAddressErrors,
  clientRoute,
  serverPrice,
  distanceKm,
  durationMin,
  routingProvider,
}: {
  country: CountryCode;
  countryLabel: string;
  pickupAddress:  StructuredAddress;
  dropoffAddress: StructuredAddress;
  setPickupAddress:  (a: StructuredAddress) => void;
  setDropoffAddress: (a: StructuredAddress) => void;
  addressErrors:    AddressErrors;
  setAddressErrors: (fn: (prev: AddressErrors) => AddressErrors) => void;
  clientRoute:    RouteResult | null;
  serverPrice:    ServerPriceResult | null;
  distanceKm:     number;
  durationMin:    number;
  routingProvider: 'OSRM' | 'haversine-fallback' | 'osrm' | 'haversine' | null;
}) {
  const { t } = useTranslation();

  const onPick = (addr: USAddress) => {
    setPickupAddress({
      street_name:  addr.street_name,
      house_number: addr.house_number,
      postcode:     addr.postcode,
      city:         addr.city,
      country:      countryLabel,
      lat:          addr.lat,
      lng:          addr.lng,
      formatted:    addr.formatted,
    });
    setAddressErrors(prev => ({ ...prev, pickup: undefined }));
  };

  const onDrop = (addr: USAddress) => {
    setDropoffAddress({
      street_name:  addr.street_name,
      house_number: addr.house_number,
      postcode:     addr.postcode,
      city:         addr.city,
      country:      countryLabel,
      lat:          addr.lat,
      lng:          addr.lng,
      formatted:    addr.formatted,
    });
    setAddressErrors(prev => ({ ...prev, dropoff: undefined }));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">{t('booking.addrTitle')}</h2>
      <p className="text-gray-500 text-sm mb-6">{t('booking.addrSubtitle')}</p>

      <div className="space-y-6">
        <div>
          <NorwayAddressAutocomplete
            id="pickup-address"
            label={t('booking.addrPickupLabel')}
            value={pickupAddress.formatted}
            placeholder={t('booking.addrPickupPlaceholder')}
            required
            countryCode={country}
            error={addressErrors.pickup}
            onSelect={onPick}
          />
          {pickupAddress.street_name && (
            <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
              <span className="font-semibold">Stored:</span>{' '}
              {formatNorwegianAddress(pickupAddress).oneLine}
              {pickupAddress.lat && (
                <span className="text-blue-400 ml-2 font-mono">
                  [{pickupAddress.lat.toFixed(5)}, {pickupAddress.lng?.toFixed(5)}]
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <NorwayAddressAutocomplete
            id="dropoff-address"
            label={t('booking.addrDropoffLabel')}
            value={dropoffAddress.formatted}
            countryCode={country}
            placeholder="e.g. Aker Brygge 1, New York"
            required
            error={addressErrors.dropoff}
            onSelect={onDrop}
          />
          {dropoffAddress.street_name && (
            <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
              <span className="font-semibold">Stored:</span>{' '}
              {formatNorwegianAddress(dropoffAddress).oneLine}
              {dropoffAddress.lat && (
                <span className="text-blue-400 ml-2 font-mono">
                  [{dropoffAddress.lat.toFixed(5)}, {dropoffAddress.lng?.toFixed(5)}]
                </span>
              )}
            </div>
          )}
        </div>

        {pickupAddress.lat && dropoffAddress.lat && (
          <DistancePill
            clientRoute={clientRoute}
            serverPrice={serverPrice}
            distanceKm={distanceKm}
            durationMin={durationMin}
            routingProvider={routingProvider}
          />
        )}
      </div>
    </div>
  );
}

function DistancePill({
  clientRoute, serverPrice, distanceKm, durationMin, routingProvider,
}: {
  clientRoute:    RouteResult | null;
  serverPrice:    ServerPriceResult | null;
  distanceKm:     number;
  durationMin:    number;
  routingProvider: 'OSRM' | 'haversine-fallback' | 'osrm' | 'haversine' | null;
}) {
  if (!clientRoute && !serverPrice) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3" role="status" aria-live="polite">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <div>
          <p className="text-blue-800 text-sm font-semibold">Calculating driving distance…</p>
          <p className="text-blue-600 text-xs">Querying OSRM for real road distance</p>
        </div>
      </div>
    );
  }

  const durationText =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
      : `${durationMin}m`;
  const providerIsOsrm = routingProvider === 'OSRM' || routingProvider === 'osrm';
  const providerLabel  = providerIsOsrm ? 'via OSRM' : 'via Haversine × 1.4 fallback';
  const sourceLabel    = serverPrice
    ? `Calculated server-side ${providerLabel}`
    : `Calculated in browser ${providerLabel}`;

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
      <div>
        <p className="text-emerald-800 text-sm font-semibold">
          {distanceKm.toFixed(1)} km · ~{durationText} drive
        </p>
        <p className="text-emerald-600 text-xs">{sourceLabel}</p>
      </div>
    </div>
  );
}

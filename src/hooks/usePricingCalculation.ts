import { useEffect, useState } from 'react';
import { calculatePrice } from '../lib/constants';
import { fetchServerPrice, type ServerPriceResult } from '../lib/calculatePrice';
import { getRouteDistance, type RouteResult } from '../lib/routing';
import type { StructuredAddress } from '../components/booking/types';

/**
 * usePricingCalculation — owns the two-track pricing strategy.
 *
 * 1. CLIENT PREVIEW: hits OSRM directly from the browser via
 *    getRouteDistance() and runs the local calculatePrice() formula.
 *    Always lands (Haversine × 1.4 fallback) so the distance pill +
 *    summary always show real numbers, no deploy dependency.
 *
 * 2. SERVER-AUTHORITATIVE: fires the calculate-price edge function in
 *    parallel; if it responds, those numbers override the preview. If
 *    not, we silently keep the preview — never blocks the booking.
 *
 * Effective values prefer the server when available, fall back to the
 * client otherwise. Submit code is expected to use the same accessors.
 */
export interface PricingCalculationInput {
  pickupAddress:      StructuredAddress;
  dropoffAddress:     StructuredAddress;
  vanType:            string;
  helpers:            number;
  additionalServices: string[];
  estimatedHours:     number;
}

export interface PricingCalculationResult {
  clientRoute:    RouteResult | null;
  serverPrice:    ServerPriceResult | null;
  pricingLoading: boolean;
  pricingError:   string | null;
  /** True once at least the client preview has produced numbers. */
  pricingReady:   boolean;

  /** Effective values — server wins, client fallback. */
  distanceKm:      number;
  durationMin:     number;
  routingProvider: 'OSRM' | 'haversine-fallback' | 'osrm' | 'haversine' | null;
  priceTotal:      number;
  priceSubtotal:   number;
  vatAmount:       number;
  basePrice:       number;
  distanceCharge:  number;
  helpersCharge:   number;
}

export function usePricingCalculation(input: PricingCalculationInput): PricingCalculationResult {
  const {
    pickupAddress, dropoffAddress,
    vanType, helpers, additionalServices, estimatedHours,
  } = input;

  const [clientRoute,    setClientRoute]    = useState<RouteResult | null>(null);
  const [serverPrice,    setServerPrice]    = useState<ServerPriceResult | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError,   setPricingError]   = useState<string | null>(null);

  /* ── Client OSRM preview ── */
  useEffect(() => {
    let cancelled = false;
    if (!pickupAddress.lat || !pickupAddress.lng || !dropoffAddress.lat || !dropoffAddress.lng) {
      setClientRoute(null);
      return undefined;
    }
    (async () => {
      const res = await getRouteDistance(
        { lat: pickupAddress.lat!, lng: pickupAddress.lng! },
        { lat: dropoffAddress.lat!, lng: dropoffAddress.lng! },
      );
      if (cancelled || !res) return undefined;
      setClientRoute(res);
    })();
    return () => { cancelled = true; };
  }, [pickupAddress.lat, pickupAddress.lng, dropoffAddress.lat, dropoffAddress.lng]);

  /* ── Server calculate-price ── */
  useEffect(() => {
    let cancelled = false;
    if (!pickupAddress.lat || !pickupAddress.lng || !dropoffAddress.lat || !dropoffAddress.lng) {
      setServerPrice(null);
      setPricingError(null);
      return undefined;
    }
    setPricingLoading(true);
    setPricingError(null);
    (async () => {
      try {
        const res = await fetchServerPrice({
          pickupLat:  pickupAddress.lat!,
          pickupLng:  pickupAddress.lng!,
          dropoffLat: dropoffAddress.lat!,
          dropoffLng: dropoffAddress.lng!,
          vanType:    vanType || 'medium_van',
          helpers,
          additionalServices,
          estimatedHours,
        });
        if (!cancelled) setServerPrice(res);
      } catch (err) {
        if (!cancelled) {
          setServerPrice(null);
          setPricingError((err as Error).message);
        }
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [
    pickupAddress.lat, pickupAddress.lng,
    dropoffAddress.lat, dropoffAddress.lng,
    vanType, helpers, additionalServices, estimatedHours,
  ]);

  const clientPricing = clientRoute
    ? calculatePrice(
        vanType || 'medium_van',
        estimatedHours,
        clientRoute.distanceKm,
        helpers,
        additionalServices,
      )
    : null;

  const distanceKm     = serverPrice?.distance_km            ?? clientRoute?.distanceKm   ?? 0;
  const durationMin    = serverPrice?.duration_minutes       ?? clientRoute?.durationMinutes ?? 0;
  const routingProvider: PricingCalculationResult['routingProvider'] =
    serverPrice?.routing_provider ?? clientRoute?.source ?? null;
  const priceTotal     = serverPrice?.price_total            ?? clientPricing?.total       ?? 0;
  const priceSubtotal  = serverPrice?.price_subtotal         ?? clientPricing?.subtotal    ?? 0;
  const vatAmount      = serverPrice?.vat_amount             ?? clientPricing?.vat         ?? 0;
  const basePrice      = serverPrice?.breakdown?.base_price      ?? clientPricing?.basePrice      ?? 0;
  const distanceCharge = serverPrice?.breakdown?.distance_charge ?? clientPricing?.distanceCharge ?? 0;
  const helpersCharge  = serverPrice?.breakdown?.helpers_charge  ?? clientPricing?.helpersCharge  ?? 0;

  return {
    clientRoute,
    serverPrice,
    pricingLoading,
    pricingError,
    pricingReady: !!(serverPrice || clientPricing),
    distanceKm,
    durationMin,
    routingProvider,
    priceTotal,
    priceSubtotal,
    vatAmount,
    basePrice,
    distanceCharge,
    helpersCharge,
  };
}

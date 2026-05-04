/**
 * Re-export shim — the canonical implementation lives in
 * formatAddress.ts (the name reflects the multi-country rebrand).
 * Older callers still import from `formatNorwegianAddress`, so this
 * file forwards everything to keep their imports working without
 * touching four step components and BookingFlow.tsx.
 */
export * from './formatAddress';
export { formatNorwegianAddress as default } from './formatAddress';

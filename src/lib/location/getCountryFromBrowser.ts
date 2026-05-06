import type { CountryCode } from '../../components/GlobalAddressAutocomplete';

/* ─────────────────────────────────────────────────────────────────
 * getCountryFromBrowser
 *
 * Browser-locale fallback for country detection. Used when neither
 * bookingData.country nor the URL pathname carries a country
 * signal. Reads:
 *
 *   1. Intl.DateTimeFormat resolvedOptions().locale — region tag
 *      (e.g. "en-US", "fr-CA"). Pulls the country part if present.
 *   2. navigator.languages / navigator.language — same parsing.
 *
 * Maps the resolved ISO-3166 alpha-2 code to one of the six
 * supported country codes. Anything unknown returns null and the
 * caller falls back to a final default (typically 'us').
 *
 * Note: navigator.language is the user's preferred UI language,
 * NOT the location of their device. We treat it as a useful proxy
 * — better than a hardcoded default, but a real geo-IP would be
 * stronger (and is tracked as a follow-up).
 * ───────────────────────────────────────────────────────────────── */

const LOCALE_REGION_TO_COUNTRY: Record<string, CountryCode> = {
  /* Legacy markets */
  US: 'us',
  CA: 'ca',
  GB: 'gb',
  UK: 'gb',
  FR: 'fr',
  DE: 'de',
  NO: 'no',
  /* Expansion markets — first wave */
  NL: 'nl',
  SE: 'se',
  ES: 'es',
  IT: 'it',
  PL: 'pl',
  /* Expansion markets — second wave */
  DK: 'dk',
  BE: 'be',
  AT: 'at',  /* Austria has its own marketplace now (was → de). */
  CH: 'ch',  /* Switzerland has its own marketplace now (was → de). */
  CZ: 'cz',
};

function regionFromLocale(locale: string | undefined): CountryCode | null {
  if (!locale) return null;
  const parts = locale.split('-');
  /* Locale tags use the format "lang[-Script]-REGION", e.g.
   * "zh-Hant-HK". Region is the last 2-letter alpha segment. */
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = parts[i].toUpperCase();
    if (/^[A-Z]{2}$/.test(seg)) {
      const hit = LOCALE_REGION_TO_COUNTRY[seg];
      if (hit) return hit;
    }
  }
  return null;
}

export function getCountryFromBrowser(): CountryCode | null {
  if (typeof navigator === 'undefined') return null;

  /* Try Intl.DateTimeFormat first — gives a fully-qualified BCP 47
   * tag with a real region in most browsers. */
  try {
    const tag = new Intl.DateTimeFormat().resolvedOptions().locale;
    const fromIntl = regionFromLocale(tag);
    if (fromIntl) return fromIntl;
  } catch { /* Intl unavailable — fall through. */ }

  /* navigator.languages → first that resolves wins. */
  const langs = (navigator.languages && navigator.languages.length > 0)
    ? navigator.languages
    : [navigator.language];
  for (const lang of langs) {
    const hit = regionFromLocale(lang);
    if (hit) return hit;
  }
  return null;
}

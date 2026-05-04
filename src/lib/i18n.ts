import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './locales/en';
import { nb } from './locales/nb';
import { de } from './locales/de';
import { fr } from './locales/fr';
import { nl } from './locales/nl';
import { sv } from './locales/sv';
import { es } from './locales/es';
import { it } from './locales/it';
import { pl } from './locales/pl';
import { da } from './locales/da';
import { cs } from './locales/cs';

/**
 * i18next setup.
 *
 * The marketplace ships English as the canonical locale and 10
 * country-shopfront languages: Norwegian Bokmål, German, French,
 * Dutch, Swedish, Spanish, Italian, Polish, Danish, and Czech.
 * Country pages set the active language on mount via
 * `applyCountryLanguage(iso)` so a customer landing on /netherlands
 * sees Dutch copy, /spain sees Spanish, etc. — with English as the
 * universal fallback for every key not yet present in a country
 * locale (most expansion locales currently ship the visible-chrome
 * subset; deep editorial copy falls back to en until per-surface
 * translation lands).
 */

const LANG_STORAGE_KEY = 'flyttgo_lang';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      nb: { translation: nb },
      de: { translation: de },
      fr: { translation: fr },
      nl: { translation: nl },
      sv: { translation: sv },
      es: { translation: es },
      it: { translation: it },
      pl: { translation: pl },
      da: { translation: da },
      cs: { translation: cs },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'nb', 'de', 'fr', 'nl', 'sv', 'es', 'it', 'pl', 'da', 'cs'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: [],
    },
  });

export default i18n;
export { LANG_STORAGE_KEY };

/** ISO 639 codes for each supported i18n locale. Single source of
 *  truth for what the language switcher offers and what
 *  applyCountryLanguage may select. */
export type SupportedLang = 'en' | 'nb' | 'de' | 'fr' | 'nl' | 'sv' | 'es' | 'it' | 'pl' | 'da' | 'cs';

/**
 * ISO 3166-1 alpha-2 country code → BCP-47 locale tag for each
 * country shopfront. Country pages call `applyCountryLanguage(iso)`
 * on mount so the shopfront switches to the local language
 * automatically. Bilingual countries map to their dominant national
 * language; the in-app language switcher lets customers override.
 */
const COUNTRY_LANG: Record<string, SupportedLang> = {
  /* Legacy markets */
  us: 'en',
  ca: 'en',     /* Canada — English baseline; fr toggle deferred. */
  gb: 'en',
  no: 'nb',
  de: 'de',
  fr: 'fr',
  /* Expansion — first wave */
  nl: 'nl',
  se: 'sv',
  es: 'es',
  it: 'it',
  pl: 'pl',
  /* Expansion — second wave */
  dk: 'da',
  be: 'fr',     /* Belgium — bilingual NL/FR; defaults to FR. */
  at: 'de',     /* Austria — German. */
  ch: 'de',     /* Switzerland — trilingual DE/FR/IT; defaults to DE. */
  cz: 'cs',
};

/**
 * Switch the active i18n language to the country's national language.
 * No-op on the server. Persists the choice to localStorage so the
 * customer's selection survives a refresh, and updates <html lang>
 * for screen readers + Google + browser-translate.
 */
export function applyCountryLanguage(iso: string): void {
  if (typeof window === 'undefined') return;
  const target = COUNTRY_LANG[iso] ?? 'en';
  if (i18n.language === target) return;
  void i18n.changeLanguage(target);
  window.localStorage.setItem(LANG_STORAGE_KEY, target);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = target;
  }
}

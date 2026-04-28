import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './locales/en';
import { nb } from './locales/nb';
import { de } from './locales/de';
import { fr } from './locales/fr';

/**
 * i18next setup.
 *
 * The marketplace ships English as the canonical locale and Norwegian
 * Bokmål, German, and French as country-shopfront languages. Country
 * pages set the active language on mount via `i18n.changeLanguage(...)`
 * so a customer landing on /norway sees Norwegian copy, /germany sees
 * German, /france sees French — with English as the universal
 * fallback for every key not present in the country locale.
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
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'nb', 'de', 'fr'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: [],
    },
  });

export default i18n;
export { LANG_STORAGE_KEY };

/**
 * ISO 3166-1 alpha-2 → BCP-47 locale tag for the country shopfronts.
 * Country pages call `applyCountryLanguage(iso)` on mount so the
 * shopfront switches to the local language automatically.
 */
const COUNTRY_LANG: Record<string, 'en' | 'nb' | 'de' | 'fr'> = {
  us: 'en',
  ca: 'en',
  gb: 'en',
  no: 'nb',
  de: 'de',
  fr: 'fr',
};

/**
 * Switch the active i18n language to the country's national language.
 * No-op on the server. Persists the choice to localStorage so the
 * customer's selection survives a refresh.
 */
export function applyCountryLanguage(iso: 'us' | 'ca' | 'gb' | 'no' | 'de' | 'fr'): void {
  if (typeof window === 'undefined') return;
  const target = COUNTRY_LANG[iso] ?? 'en';
  if (i18n.language === target) return;
  void i18n.changeLanguage(target);
  window.localStorage.setItem(LANG_STORAGE_KEY, target);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = target;
  }
}

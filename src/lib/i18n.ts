import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './locales/en';

/**
 * i18next setup.
 *
 * The US site ships English only. The infrastructure stays in place so a
 * second locale (e.g. Spanish) can be added by dropping in a new file under
 * locales/ and registering it in `resources` + `supportedLngs`.
 */

const LANG_STORAGE_KEY = 'flyttgo_lang';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    fallbackLng: 'en',
    supportedLngs: ['en'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: [],
    },
  });

export default i18n;
export { LANG_STORAGE_KEY };

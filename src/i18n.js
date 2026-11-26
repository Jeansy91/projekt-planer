import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import de from './locales/de.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    supportedLngs: ['de', 'en'],
    fallbackLng: 'de',
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'planner_language',
      // Browsers report regional codes such as en-US; the app only knows de and en
      convertDetectedLanguage: (lng) => lng.split('-')[0],
    },
  });

const syncLang = (lng) => { document.documentElement.lang = lng?.split('-')[0] || 'de'; };
syncLang(i18n.language);
i18n.on('languageChanged', syncLang);

export default i18n;

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import uzTranslation from './locales/uz.json';
import enTranslation from './locales/en.json';
import ruTranslation from './locales/ru.json';
import trTranslation from './locales/tr.json';
import arTranslation from './locales/ar.json';

export const SUPPORTED_LANGUAGES = ['uz', 'en', 'ru', 'tr', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uzTranslation },
      en: { translation: enTranslation },
      ru: { translation: ruTranslation },
      tr: { translation: trTranslation },
      ar: { translation: arTranslation },
    },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    // O'zbekiston platformasi — sukut bo'yicha o'zbek tili
    fallbackLng: 'uz',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

/** <html lang> va yozuv yo'nalishi (arabcha — o'ngdan chapga) tanlangan tilga moslanadi. */
const RTL_LANGUAGES = new Set(["ar"]);
const applyDocumentLanguage = (lng: string) => {
  if (typeof document === "undefined") return;
  const lang = (lng || "uz").split("-")[0];
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGUAGES.has(lang) ? "rtl" : "ltr";
};
applyDocumentLanguage(i18n.language);
i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;

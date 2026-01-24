import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import ruTranslation from './locales/ru.json';
import trTranslation from './locales/tr.json'; // Turkcha tarjimani import qilish
import arTranslation from './locales/ar.json'; // Arabcha tarjimani import qilish

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      ru: {
        translation: ruTranslation,
      },
      tr: { // Turkcha resursni qo'shish
        translation: trTranslation,
      },
      ar: { // Arabcha resursni qo'shish
        translation: arTranslation,
      },
    },
    fallbackLng: 'en', // Sukut bo'yicha ingliz tili
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
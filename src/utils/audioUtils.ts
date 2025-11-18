"use client";

import i18n from '@/i18n';

/**
 * Matnni ovozga aylantirish uchun Web Speech API'dan foydalanadi.
 * @param text Ovozga aylantiriladigan matn.
 * @param lang Til kodi (masalan, 'en-US').
 */
export const speakText = (text: string, lang: string = 'en-US') => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    console.log(`AudioUtils: Speaking: "${text}" in ${lang}`);
  } else {
    console.warn(i18n.t("add_question_page.web_speech_api_not_supported"));
  }
};
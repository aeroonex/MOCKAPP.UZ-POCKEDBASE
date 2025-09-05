"use client";

/**
 * Matnni ovozga aylantirish uchun Web Speech API'dan foydalanadi.
 * @param text Ovozga aylantiriladigan matn.
 * @param lang Til kodi (masalan, 'en-US').
 */
export const speakText = (text: string, lang: string = 'en-US') => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; // Nutq tezligi
    utterance.pitch = 1; // Nutq balandligi
    window.speechSynthesis.speak(utterance);
    console.log(`AudioUtils: Speaking: "${text}" in ${lang}`);
  } else {
    console.warn("AudioUtils: Web Speech API is not supported in this browser.");
  }
};
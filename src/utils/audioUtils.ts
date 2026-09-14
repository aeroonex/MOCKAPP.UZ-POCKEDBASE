"use client";

import i18n from '@/i18n';
import { api } from '@/lib/api';
import { recorderState } from '@/lib/recorder-state';

let current: HTMLAudioElement | null = null;

/** Hozir o'qilayotgan savol/iborani to'xtatadi (audio fayl ham, brauzer TTS ham). */
export const stopSpeaking = () => {
  if (current) {
    current.pause();
    current.src = "";
    current = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
};

const speakWithBrowser = (text: string, lang: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn(i18n.t("add_question_page.web_speech_api_not_supported"));
  }
};

/**
 * Matnni ovoz bilan o'qiydi. `audioUrl` (serverda Piper bilan tayyorlangan MP3) bo'lsa — uni ijro etadi
 * va yozuv ketayotgan bo'lsa videoga ham aralashtiradi; bo'lmasa brauzer TTS'iga qaytadi.
 */
export const speakText = (text: string, lang: string = 'en-US', audioUrl?: string | null) => {
  stopSpeaking();
  if (!audioUrl) {
    speakWithBrowser(text, lang);
    return;
  }
  const el = new Audio(api.fileUrl(audioUrl));
  el.preload = "auto";
  current = el;
  const mix = recorderState.audioMix;
  if (mix) {
    try {
      // Savol ovozi ham videoda eshitilsin (quloqchin bilan ham)
      const src = mix.ctx.createMediaElementSource(el);
      src.connect(mix.ctx.destination);
      src.connect(mix.sink);
    } catch (e) {
      console.warn("audio mix:", e);
    }
  }
  el.play().catch((e) => {
    console.warn("audio play failed, fallback to browser TTS:", e);
    if (current === el) current = null;
    speakWithBrowser(text, lang);
  });
};

/** Test boshlanishida savol ovozlarini oldindan yuklab qo'yadi (kechikmasin). */
export const preloadAudio = (urls: Array<string | null | undefined>) => {
  for (const u of urls) {
    if (!u) continue;
    try {
      const a = new Audio(api.fileUrl(u));
      a.preload = "auto";
      a.load();
    } catch {
      /* e'tiborsiz */
    }
  }
};

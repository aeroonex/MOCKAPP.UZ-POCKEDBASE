"use client";

import i18n from '@/i18n';
import { api } from '@/lib/api';
import { recorderState } from '@/lib/recorder-state';

let current: HTMLAudioElement | null = null;
// Har bir speakText chaqiruvi raqamlanadi — kechikib kelgan eski ovoz yangisini bosib ketmasin
let speakSeq = 0;

// Oldindan yuklangan ovozlar: URL -> blob URL. Blob'dan ijro etish tarmoqqa bog'liq emas va
// Chrome'ning bir URL'ga bir vaqtda ikki media so'rovi (ERR_CACHE_OPERATION_NOT_SUPPORTED) muammosini chetlab o'tadi.
const blobCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

const fetchToBlobUrl = (url: string): Promise<string | null> => {
  const cached = blobCache.get(url);
  if (cached) return Promise.resolve(cached);
  const running = inflight.get(url);
  if (running) return running;
  const p = fetch(api.fileUrl(url), { cache: "force-cache" })
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((b) => {
      const o = URL.createObjectURL(b);
      blobCache.set(url, o);
      return o;
    })
    .catch(() => null)
    .finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
};

/** Hozir o'qilayotgan savol/iborani to'xtatadi (audio fayl ham, brauzer TTS ham). */
export const stopSpeaking = () => {
  if (current) {
    current.pause();
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
  const seq = ++speakSeq;
  const play = (src: string) => {
    if (seq !== speakSeq) return; // shu orada yangi ovoz so'ralgan
    const el = new Audio(src);
    el.preload = "auto";
    current = el;
    const mix = recorderState.audioMix;
    if (mix) {
      try {
        // Savol ovozi ham videoda eshitilsin (quloqchin bilan ham)
        const node = mix.ctx.createMediaElementSource(el);
        node.connect(mix.ctx.destination);
        node.connect(mix.sink);
      } catch (e) {
        console.warn("audio mix:", e);
      }
    }
    el.onended = () => {
      if (current === el) current = null;
    };
    el.play().catch((e) => {
      console.warn("audio play failed, fallback to browser TTS:", e);
      if (current === el) current = null;
      speakWithBrowser(text, lang);
    });
  };
  const ready = blobCache.get(audioUrl);
  if (ready) {
    play(ready);
    return;
  }
  // Oldindan yuklanmagan bo'lsa — qisqa kutib (1.5 s) blob'ga olamiz, bo'lmasa to'g'ridan-to'g'ri
  const timeout = new Promise<string | null>((r) => setTimeout(() => r(null), 1500));
  Promise.race([fetchToBlobUrl(audioUrl), timeout]).then((o) => play(o ?? api.fileUrl(audioUrl)));
};

/** Test boshlanishida savol ovozlarini oldindan (blob sifatida) yuklab qo'yadi — ijro kechikmasin. */
export const preloadAudio = (urls: Array<string | null | undefined>) => {
  for (const u of urls) {
    if (u) void fetchToBlobUrl(u);
  }
};

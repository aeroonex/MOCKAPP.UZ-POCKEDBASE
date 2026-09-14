/**
 * Yozib olish holati — React'dan tashqarida o'qiladi:
 *  - isRecording / startedAt: fon yuklovchi test paytida tarmoqni band qilmasligi, hodisalar vaqti uchun
 *  - audioMix: yozuv ketayotganda savol ovozi (MP3) ham videoga aralashtirilishi uchun
 *  - integrityEvents: halollik nazorati hodisalari (tab, to'liq ekran, yuz) — yozuv bilan birga serverga ketadi
 */
export interface IntegrityEvent {
  /** yozuv boshidan o'tgan soniya */
  t: number;
  type: "window_blur" | "window_focus" | "fullscreen_exit" | "fullscreen_enter" | "face_missing" | "face_back" | "faces_multiple";
  detail?: string;
}

export const recorderState: {
  isRecording: boolean;
  startedAt: number;
  audioMix: { ctx: AudioContext; sink: MediaStreamAudioDestinationNode } | null;
  integrityEvents: IntegrityEvent[];
} = { isRecording: false, startedAt: 0, audioMix: null, integrityEvents: [] };

/** Hodisani yozuv vaqtiga bog'lab saqlaydi (yozuv ketmayotgan bo'lsa e'tiborsiz). */
export function logIntegrityEvent(type: IntegrityEvent["type"], detail?: string): IntegrityEvent | null {
  if (!recorderState.isRecording || !recorderState.startedAt) return null;
  const ev: IntegrityEvent = { t: Math.max(0, Math.round((Date.now() - recorderState.startedAt) / 10) / 100), type, ...(detail ? { detail } : {}) };
  if (recorderState.integrityEvents.length < 500) recorderState.integrityEvents.push(ev);
  return ev;
}

/** Qisqa xulosa: hodisalar soni va yuzsiz vaqt (soniya). */
export function integritySummary(events: IntegrityEvent[]) {
  let blur = 0;
  let fullscreen = 0;
  let multiple = 0;
  let faceMissingSec = 0;
  let missingSince: number | null = null;
  for (const e of events) {
    if (e.type === "window_blur") blur++;
    else if (e.type === "fullscreen_exit") fullscreen++;
    else if (e.type === "faces_multiple") multiple++;
    else if (e.type === "face_missing") missingSince = e.t;
    else if (e.type === "face_back" && missingSince !== null) {
      faceMissingSec += Math.max(0, e.t - missingSince);
      missingSince = null;
    }
  }
  return { blur, fullscreen, multiple, faceMissingSec: Math.round(faceMissingSec), total: blur + fullscreen + multiple + (faceMissingSec > 0 ? 1 : 0) };
}

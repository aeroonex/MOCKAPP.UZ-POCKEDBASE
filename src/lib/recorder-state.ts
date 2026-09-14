/**
 * Yozib olish holati — React'dan tashqarida o'qiladi:
 *  - isRecording: fon yuklovchi test paytida tarmoqni band qilmasligi uchun
 *  - audioMix: yozuv ketayotganda savol ovozi (MP3) ham videoga aralashtirilishi uchun
 */
export const recorderState: {
  isRecording: boolean;
  audioMix: { ctx: AudioContext; sink: MediaStreamAudioDestinationNode } | null;
} = { isRecording: false, audioMix: null };

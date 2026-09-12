/** EduAi (Gemini) ixtiyoriy tashqi xizmat — faqat VITE_GEMINI_API_KEY berilganda yoqiladi. */
export const geminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() || "";
export const isEduAiConfigured = geminiApiKey.length > 0;

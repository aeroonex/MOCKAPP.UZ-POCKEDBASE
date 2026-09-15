import { api } from "@/lib/api";

/**
 * Writing AI tekshiruv — tiplar va so'rov. Hozir mijozda namunaviy javob (mock),
 * backend tayyor bo'lganda faqat `evaluateWriting` ichidagi chaqiruv real endpointga almashtiriladi.
 */

export type CriterionKey = "task" | "coherence" | "vocabulary" | "grammar";

export interface WritingCriterion {
  key: CriterionKey;
  score: number; // 0..max
  max: number;
  reason: string; // AI nega shu ball qo'yganini tushuntiradi
}

export interface WritingCorrection {
  wrong: string;
  right: string;
  note?: string;
}

export interface WritingUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_som: number; // shu tekshiruv narxi (so'm)
}

export interface WritingAnalysis {
  extracted_text: string; // AI rasmdan/matndan o'qigan matn (tekshirish uchun)
  word_count: number;
  overall: number; // 0..75 (CEFR Multilevel)
  level: string; // A2/B1/B2/C1
  criteria: WritingCriterion[];
  summary: string; // umumiy xulosa (nega shu daraja)
  suggestions: string[]; // yaxshilash bo'yicha maslahatlar
  corrections: WritingCorrection[]; // xato -> to'g'ri
  model: string;
  usage: WritingUsage;
  balance_som: number; // yechilgandan keyingi qolgan balans
}

export interface WritingModel {
  id: string;
  label: string;
  provider: "gemini" | "openai";
}

export const WRITING_MODELS: WritingModel[] = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (tez, arzon)", provider: "gemini" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (aniqroq)", provider: "gemini" },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", label: "GPT-4o mini (arzon)", provider: "openai" },
];

export const CRITERIA_LABEL: Record<CriterionKey, string> = {
  task: "Task Achievement",
  coherence: "Coherence & Cohesion",
  vocabulary: "Lexical Resource",
  grammar: "Grammatical Range",
};

export interface EvaluateInput {
  task?: string; // Writing topshirig'i (ixtiyoriy)
  text?: string; // yozilgan matn (agar terilgan bo'lsa)
  images?: string[]; // qo'lyozma rasm(lar) — data URL
  model: string;
}

/** CEFR Multilevel (75) — mijoz bilan bir xil */
export function writingLevel(overall: number): { label: string; cls: string } {
  if (overall >= 65) return { label: "C1", cls: "bg-emerald-500" };
  if (overall >= 51) return { label: "B2", cls: "bg-sky-500" };
  if (overall >= 38) return { label: "B1", cls: "bg-amber-500" };
  return { label: "A2", cls: "bg-rose-500" };
}

export async function getWritingBalance(): Promise<{ balance_som: number }> {
  try {
    return await api.get<{ balance_som: number }>("/api/writing/balance");
  } catch {
    return { balance_som: 0 };
  }
}

/**
 * Writing'ni AI bilan baholaydi. HOZIR: namunaviy natija (backend tayyor emas).
 * Backend tayyor bo'lganda pastdagi mock o'rniga:  return api.post("/api/writing/evaluate", input);
 */
export async function evaluateWriting(input: EvaluateInput): Promise<WritingAnalysis> {
  // --- MOCK (backend keyin ulanadi) ---
  await new Promise((r) => setTimeout(r, 1600));
  const sample =
    input.text?.trim() ||
    "Nowadays technology plays a big role in our life. Many people think that it makes life easier, but some believe it has negative effects on communication. In my opinion, technology is helpful if we use it correctly.";
  const words = sample.split(/\s+/).filter(Boolean).length;
  const overall = 58;
  const inTok = 850 + (input.images?.length ? 1200 : 0);
  const outTok = 620;
  const total = inTok + outTok;
  const cost = Math.round((total / 1000) * 180); // 180 so'm / 1K token (namuna)
  return {
    extracted_text: sample,
    word_count: words,
    overall,
    level: writingLevel(overall).label,
    criteria: [
      { key: "task", score: 15, max: 20, reason: "Vazifaga javob berilgan, lekin ikkinchi savol qismi to'liq yoritilmagan; misollar yetarli emas." },
      { key: "coherence", score: 14, max: 20, reason: "Paragraflar mantiqiy, bog'lovchilar bor, ammo ba'zi o'tishlar keskin." },
      { key: "vocabulary", score: 15, max: 20, reason: "Lug'at yetarli, lekin takrorlar ko'p ('technology' 4 marta); sinonimlar kam." },
      { key: "grammar", score: 14, max: 15, reason: "Grammatika asosan to'g'ri; artikl va zamon xatolari bor." },
    ],
    summary:
      "Yozma ish B2 darajasining quyi qismiga to'g'ri keladi. Fikr aniq bayon etilgan va tuzilma bor, biroq vazifaning ikkinchi qismi to'liq yoritilmagani va lug'atdagi takrorlar bahoni pasaytirdi. Grammatik xatolar kam, lekin aniqlik uchun artikl va zamonlarga e'tibor kerak.",
    suggestions: [
      "Vazifaning har ikki qismini teng yoriting va har biriga aniq misol keltiring.",
      "Takroriy so'zlarni sinonimlar bilan almashtiring (technology → digital tools, devices).",
      "Kirish va xulosani kuchaytiring; fikringizni bitta jumlada aniq bildiring.",
    ],
    corrections: [
      { wrong: "it makes life easier", right: "it makes life easier", note: "to'g'ri" },
      { wrong: "has negative effects on communication", right: "has a negative effect on communication", note: "artikl / birlik" },
      { wrong: "if we use it correctly", right: "if we use it correctly", note: "yaxshi" },
    ],
    model: input.model,
    usage: { input_tokens: inTok, output_tokens: outTok, total_tokens: total, cost_som: cost },
    balance_som: Math.max(0, 50000 - cost),
  };
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Yangi: Matnni normalizatsiya qilish funksiyasi
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\s]/g, '').trim();
}

// Helper to normalize sub_questions for comparison (moved from local-db.ts)
export const normalizeSubQuestions = (subQuestions: string[] | undefined): string => {
  if (!subQuestions) return '';
  return subQuestions.map(q => q.trim()).filter(Boolean).sort().join('|||');
};
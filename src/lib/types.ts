// src/lib/types.ts

export interface SpeakingQuestion {
  id: string;
  text: string;
  date: string; // ISO string
}

export type SpeakingPart = "Part 1" | "Part 1.1" | "Part 2" | "Part 3";
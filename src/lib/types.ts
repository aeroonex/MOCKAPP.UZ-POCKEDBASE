// src/lib/types.ts

export type SpeakingPart = "Part 1.1" | "Part 1.2" | "Part 2" | "Part 3";

export interface BaseSpeakingQuestion {
  id: string;
  date: string; // ISO string
}

export interface Part1_1Question extends BaseSpeakingQuestion {
  type: "part1.1";
  subQuestions: string[]; // 3 questions per image, now without images
}

export interface Part1_2Question extends BaseSpeakingQuestion {
  type: "part1.2";
  imageUrls: string[]; // 2 images for Part 1.2
  subQuestions: string[]; // 3 questions per image
}

export interface Part2Question extends BaseSpeakingQuestion {
  type: "part2";
  imageUrls: string[]; // Changed from imageUrl to imageUrls
  question: string;
}

export interface Part3Question extends BaseSpeakingQuestion {
  type: "part3";
  question: string;
  imageUrls: string[]; // Changed from imageUrl to imageUrls
}

export type SpeakingQuestion = Part1_1Question | Part1_2Question | Part2Question | Part3Question;

export interface StudentInfo {
  id: string;
  name: string;
  phone: string;
}

export interface BaseRecordedSession {
  timestamp: string;
  duration: number; // in seconds
  studentInfo?: StudentInfo; // Optional student information
  supabaseUrl: string; // Supabase'da saqlangan videoning URL manzili
}

export interface RecordedSession extends BaseRecordedSession {
  // `url` endi `supabaseUrl` bilan bir xil bo'ladi, shuning uchun alohida `url` maydoni kerak emas.
  // Lekin mavjud komponentlar bilan moslik uchun uni saqlab qolamiz va `supabaseUrl` ga tenglashtiramiz.
  url: string; 
}
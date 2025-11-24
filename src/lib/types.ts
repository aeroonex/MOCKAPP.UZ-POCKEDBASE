// src/lib/types.ts

export type SpeakingPart = "Part 1.1" | "Part 1.2" | "Part 2" | "Part 3";

export interface BaseSpeakingQuestion {
  id: string; // uuid
  user_id: string; // Lokal rejimda 'local_user' bo'ladi
  date: string; // ISO string
  last_used?: string; // ISO string
  type: SpeakingPart;
  isSimilar?: boolean; // Yangi: Savolning o'xshashligini belgilash uchun
}

export interface Part1_1Question extends BaseSpeakingQuestion {
  type: "Part 1.1";
  sub_questions: string[];
}

export interface Part1_2Question extends BaseSpeakingQuestion {
  type: "Part 1.2";
  image_urls: string[]; // Base64 stringlari bo'lishi mumkin
  sub_questions: string[];
}

export interface Part2Question extends BaseSpeakingQuestion {
  type: "Part 2";
  image_urls: string[]; // Base64 stringlari bo'lishi mumkin
  question_text: string;
}

export interface Part3Question extends BaseSpeakingQuestion {
  type: "Part 3";
  question_text: string;
  image_urls: string[]; // Base64 stringlari bo'lishi mumkin
}

export type SpeakingQuestion = Part1_1Question | Part1_2Question | Part2Question | Part3Question;

export interface StudentInfo {
  id: string;
  name: string;
  phone: string;
}

export interface MoodEntry {
  id: string; // uuid
  user_id: string; // Lokal rejimda 'local_user' bo'ladi
  date: string; // ISO string
  mood: string;
  text: string;
}

// This is what we'll fetch from IndexedDB and use in the Records page
export interface RecordedSession {
  id: string; // uuid
  user_id: string; // Lokal rejimda 'local_user' bo'ladi
  timestamp: string; // ISO string
  duration: number; // in seconds
  student_id?: string;
  student_name?: string;
  student_phone?: string;
  video_url: string; // Blob URL from IndexedDB or Supabase public URL
  supabase_url?: string; // Supabase'ga yuklangan videoning ommaviy URL manzili
  isLocalBlobAvailable?: boolean; // Yangi: video blob mahalliy IndexedDBda mavjudligini bildiradi
}
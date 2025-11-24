// src/lib/types.ts

export type SpeakingPart = "Part 1.1" | "Part 1.2" | "Part 2" | "Part 3";
export type ListeningQuestionType = "Complete Section" | "Multiple Choice" | "Short Answer"; // Yangi: Listening savol turlari
export type CEFRSectionType = "Listening" | "Reading" | "Writing" | "Speaking";

export interface BaseQuestion {
  id: string; // uuid
  user_id: string; // Lokal rejimda 'local_user' bo'ladi
  date: string; // ISO string
  last_used?: string; // ISO string
  type: string; // SpeakingPart yoki ListeningQuestionType bo'lishi mumkin
  isSimilar?: boolean; // Yangi: Savolning o'xshashligini belgilash uchun
}

export interface Part1_1Question extends BaseQuestion {
  type: "Part 1.1";
  sub_questions: string[];
}

export interface Part1_2Question extends BaseQuestion {
  type: "Part 1.2";
  image_urls: string[]; // Base64 stringlari bo'lishi mumkin
  sub_questions: string[];
}

export interface Part2Question extends BaseQuestion {
  type: "Part 2";
  image_urls: string[]; // Base64 stringlari bo'lishi mumkin
  question_text: string;
}

export interface Part3Question extends BaseQuestion {
  type: "Part 3";
  question_text: string;
  image_urls: string[]; // Base64 stringlari bo'lishi mumkin
}

export type SpeakingQuestion = Part1_1Question | Part1_2Question | Part2Question | Part3Question;

// Yangi: Listening savol interfeyslari
export interface CompleteSectionQuestion extends BaseQuestion {
  type: "Complete Section";
  audio_url: string; // Audio fayl manzili
  question_html: string; // Jadvalni o'z ichiga olgan HTML matni
  answers: {
    id: string; // Savolning ichidagi javob maydonining IDsi (masalan, {fish})
    correct_answer: string; // To'g'ri javob
  }[];
}

export type ListeningQuestion = CompleteSectionQuestion; // Kelajakda boshqa turlar qo'shilishi mumkin

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

// Yangi CEFR test turlari
export interface CEFRTest {
  id: string;
  user_id: string;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CEFRSection {
  id: string;
  test_id: string;
  type: CEFRSectionType;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface CEFRQuestion {
  id: string;
  section_id: string;
  question_text?: string;
  audio_url?: string;
  image_urls?: string[];
  correct_answer?: string;
  question_type: string; // 'multiple_choice', 'writing_task', 'system_generated_part1_1', etc.
  word_limit?: number;
  sub_questions?: string[]; // For Speaking Part 1.1
  created_at: string;
  updated_at: string;
}

export interface CEFRQuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  created_at: string;
  updated_at: string;
}

export interface CEFRWritingRubric {
  id: string;
  question_id: string;
  criterion: string;
  description: string;
  score_range: string;
  created_at: string;
  updated_at: string;
}
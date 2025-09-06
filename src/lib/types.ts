// src/lib/types.ts

export type SpeakingPart = "Part 1.1" | "Part 1.2" | "Part 2" | "Part 3";

export interface BaseSpeakingQuestion {
  id: string; // uuid
  user_id: string; // uuid
  date: string; // ISO string
  last_used?: string; // ISO string
  type: "part1.1" | "part1.2" | "part2" | "part3";
}

export interface Part1_1Question extends BaseSpeakingQuestion {
  type: "part1.1";
  sub_questions: string[];
}

export interface Part1_2Question extends BaseSpeakingQuestion {
  type: "part1.2";
  image_urls: string[];
  sub_questions: string[];
}

export interface Part2Question extends BaseSpeakingQuestion {
  type: "part2";
  image_urls: string[];
  question_text: string;
}

export interface Part3Question extends BaseSpeakingQuestion {
  type: "part3";
  question_text: string;
  image_urls: string[];
}

export type SpeakingQuestion = Part1_1Question | Part1_2Question | Part2Question | Part3Question;

export interface StudentInfo {
  id: string;
  name: string;
  phone: string;
}

// This is what we'll fetch from Supabase and use in the Records page
export interface RecordedSession {
  id: string; // uuid
  user_id: string; // uuid
  timestamp: string; // ISO string
  duration: number; // in seconds
  student_id?: string;
  student_name?: string;
  student_phone?: string;
  video_url: string; // Public URL from Supabase Storage
}
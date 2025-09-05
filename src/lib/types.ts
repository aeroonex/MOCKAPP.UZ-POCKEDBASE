// src/lib/types.ts

export type SpeakingPart = "Part 1" | "Part 1.1" | "Part 2" | "Part 3";

export interface BaseSpeakingQuestion {
  id: string;
  date: string; // ISO string
}

export interface Part1Question extends BaseSpeakingQuestion {
  type: "part1";
  text: string;
}

export interface Part1_1Question extends BaseSpeakingQuestion {
  type: "part1.1";
  imageUrl: string;
  subQuestions: string[]; // 3 questions per image
}

export interface Part2Question extends BaseSpeakingQuestion {
  type: "part2";
  imageUrl: string;
  question: string;
}

export interface Part3Question extends BaseSpeakingQuestion {
  type: "part3";
  question: string;
  imageUrl: string;
}

export type SpeakingQuestion = Part1Question | Part1_1Question | Part2Question | Part3Question;

export interface StudentInfo {
  id: string;
  name: string;
  phone: string;
}

export interface RecordedSession {
  url: string;
  timestamp: string;
  duration: number; // in seconds
  studentInfo?: StudentInfo; // Optional student information
}
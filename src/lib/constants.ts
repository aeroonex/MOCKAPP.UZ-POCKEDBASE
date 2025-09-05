// src/lib/constants.ts

import { SpeakingPart } from "./types";

export const allSpeakingParts: SpeakingPart[] = ["Part 1", "Part 1.1", "Part 2", "Part 3"];

export const getSpeakingQuestionStorageKey = (part: SpeakingPart): string => {
  return `speakingQuestions_${part.replace(/\s/g, '_').replace(/\./g, '')}`;
};
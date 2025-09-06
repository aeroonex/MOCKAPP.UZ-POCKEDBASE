"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { speakText } from "@/utils/audioUtils";
import {
  SpeakingQuestion,
  SpeakingPart,
  StudentInfo,
  Part1_1Question,
  Part1_2Question,
  Part2Question,
  Part3Question,
} from "@/lib/types";
import { allSpeakingParts } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

const TIMINGS = {
  PRE_TEST_COUNTDOWN: 5,
  PART1_1_QUESTION: 30,
  PART1_2_QUESTION: 30,
  PART2_PREP: 60,
  PART2_SPEAK: 120,
  PART3_PREP: 60,
  PART3_SPEAK: 120,
  ANNOUNCEMENT_DELAY: 5,
  ANNOUNCEMENT_SPEAK_DURATION: 2,
};

export type TestPhase = "idle" | "pre_test_countdown" | "preparation" | "speaking" | "question_display" | "part_finished_announcement" | "next_part_announcement" | "finished";

interface UseMockTestLogicProps {
  startRecording: (studentInfo: StudentInfo) => Promise<boolean>;
  stopAllStreams: () => void;
}

function getRandomElements<T>(arr: T[], num: number): T[] {
  if (arr.length === 0 || num <= 0) return [];
  if (num >= arr.length) return [...arr];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
}

export const useMockTestLogic = ({
  startRecording,
  stopAllStreams,
}: UseMockTestLogicProps) => {
  const [isTestStarted, setIsTestStarted] = useState<boolean>(false);
  const [questions, setQuestions] = useState<Record<SpeakingPart, SpeakingQuestion[]>>({
    "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
  });
  const allAvailableQuestionsRef = useRef<Record<SpeakingPart, SpeakingQuestion[]>>({
    "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
  });

  const [currentPartIndex, setCurrentPartIndex] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentSubQuestionIndex, setCurrentSubQuestionIndex] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<TestPhase>("idle");
  const [countdown, setCountdown] = useState<number>(0);
  const [initialCountdown, setInitialCountdown] = useState<number>(0);
  const [isStudentInfoFormOpen, setIsStudentInfoFormOpen] = useState<boolean>(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  const countdownIntervalRef = useRef<number | null>(null);

  const getCurrentQuestion = useCallback(() => {
    const currentPartName = allSpeakingParts[currentPartIndex];
    return questions[currentPartName]?.[currentQuestionIndex];
  }, [currentPartIndex, currentQuestionIndex, questions]);

  const startCountdown = useCallback((duration: number, nextAction: () => void) => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setInitialCountdown(duration);
    setCountdown(duration);
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          nextAction();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const advanceTest = useCallback(() => {
    const currentPartName = allSpeakingParts[currentPartIndex];
    const currentQ = getCurrentQuestion();

    if (!currentQ) {
      if (currentPartIndex < allSpeakingParts.length - 1) {
        setCurrentPhase("part_finished_announcement");
      } else {
        stopAllStreams();
        setIsTestStarted(false);
        setCurrentPhase("finished");
        showSuccess("Mock test yakunlandi!");
      }
      return;
    }

    switch (currentQ.type) {
      case "part1.1":
      case "part1.2": {
        const subQCount = (currentQ as Part1_1Question | Part1_2Question).sub_questions.length;
        if (currentSubQuestionIndex < subQCount - 1) {
          setCurrentSubQuestionIndex(prev => prev + 1);
          setCurrentPhase("question_display");
        } else {
          if (currentQuestionIndex < questions[currentPartName].length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentSubQuestionIndex(0);
            setCurrentPhase("question_display");
          } else {
            setCurrentPhase("part_finished_announcement");
          }
        }
        break;
      }
      case "part2":
      case "part3": {
        if (currentPhase === "question_display") setCurrentPhase("preparation");
        else if (currentPhase === "preparation") setCurrentPhase("speaking");
        else if (currentPhase === "speaking") setCurrentPhase("part_finished_announcement");
        break;
      }
      default:
        setCurrentPhase("part_finished_announcement");
        break;
    }
  }, [currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, questions, currentPhase, stopAllStreams, getCurrentQuestion]);

  const loadAllQuestions = useCallback(async () => {
    const { data, error } = await supabase.from('speaking_questions').select('*');
    if (error) {
      showError("Test uchun savollarni yuklab bo'lmadi.");
      return;
    }
    const loadedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
      "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
    };
    data.forEach((q: any) => {
      if (loadedQuestions[q.type as SpeakingPart]) {
        loadedQuestions[q.type as SpeakingPart].push(q);
      }
    });
    allAvailableQuestionsRef.current = loadedQuestions;
  }, []);

  useEffect(() => {
    loadAllQuestions();
  }, [loadAllQuestions]);

  useEffect(() => {
    if (!isTestStarted || currentPhase === "idle" || currentPhase === "finished") {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }

    let duration = 0;
    let nextAction: () => void = advanceTest;

    if (currentPhase === "pre_test_countdown") {
      duration = TIMINGS.PRE_TEST_COUNTDOWN;
      nextAction = () => setCurrentPhase("idle");
    } else if (currentPhase === "part_finished_announcement") {
      speakText(`${allSpeakingParts[currentPartIndex]} finished.`, 'en-US');
      duration = TIMINGS.ANNOUNCEMENT_DELAY;
      nextAction = () => {
        setCurrentPartIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
        setCurrentSubQuestionIndex(0);
        setCurrentPhase("next_part_announcement");
      };
    } else if (currentPhase === "next_part_announcement") {
      const nextPartName = allSpeakingParts[currentPartIndex];
      if (nextPartName) {
        speakText(nextPartName, 'en-US');
        duration = TIMINGS.ANNOUNCEMENT_SPEAK_DURATION;
        nextAction = () => {
          if (questions[nextPartName]?.length > 0) {
            setCurrentPhase("question_display");
          } else {
            advanceTest();
          }
        };
      } else {
        stopAllStreams();
        setIsTestStarted(false);
        setCurrentPhase("finished");
        showSuccess("Mock test yakunlandi!");
        return;
      }
    } else {
      const currentQ = getCurrentQuestion();
      if (!currentQ) {
        advanceTest();
        return;
      }
      switch (currentQ.type) {
        case "part1.1": duration = TIMINGS.PART1_1_QUESTION; break;
        case "part1.2": duration = TIMINGS.PART1_2_QUESTION; break;
        case "part2":
          if (currentPhase === "preparation") duration = TIMINGS.PART2_PREP;
          else if (currentPhase === "speaking") duration = TIMINGS.PART2_SPEAK;
          else duration = 0;
          break;
        case "part3":
          if (currentPhase === "preparation") duration = TIMINGS.PART3_PREP;
          else if (currentPhase === "speaking") duration = TIMINGS.PART3_SPEAK;
          else duration = 0;
          break;
      }
    }

    if (duration > 0) startCountdown(duration, nextAction);
    else nextAction();

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isTestStarted, currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, currentPhase, questions, startCountdown, advanceTest, stopAllStreams, getCurrentQuestion]);

  useEffect(() => {
    if (isTestStarted && currentPhase === "idle") {
      const totalQuestions = allSpeakingParts.reduce((sum, part) => sum + questions[part].length, 0);
      if (totalQuestions === 0) {
        showError("Mock testni boshlash uchun savollar mavjud emas.");
        setIsTestStarted(false);
        return;
      }
      const firstPartWithQuestionsIndex = allSpeakingParts.findIndex(part => questions[part].length > 0);
      if (firstPartWithQuestionsIndex !== -1) {
        setCurrentPartIndex(firstPartWithQuestionsIndex);
        setCurrentQuestionIndex(0);
        setCurrentSubQuestionIndex(0);
        setCurrentPhase("question_display");
      }
    }
  }, [isTestStarted, currentPhase, questions]);

  useEffect(() => {
    if (isTestStarted && currentPhase === "question_display") {
      const currentQ = getCurrentQuestion();
      if (currentQ) {
        let textToSpeak = "";
        if (currentQ.type === "part1.1" || currentQ.type === "part1.2") {
          textToSpeak = (currentQ as Part1_1Question | Part1_2Question).sub_questions[currentSubQuestionIndex];
        } else if (currentQ.type === "part2" || currentQ.type === "part3") {
          textToSpeak = (currentQ as Part2Question | Part3Question).question_text;
        }
        if (textToSpeak) speakText(textToSpeak, 'en-US');
      }
    }
  }, [isTestStarted, currentPhase, currentSubQuestionIndex, getCurrentQuestion]);

  const handleStartTestClick = async () => {
    await loadAllQuestions();
    const selectedQuestionsForTest: Record<SpeakingPart, SpeakingQuestion[]> = {
      "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
    };
    const minQuestions: Record<SpeakingPart, number> = {
      "Part 1.1": 3, "Part 1.2": 1, "Part 2": 1, "Part 3": 1,
    };
    const now = new Date();
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    let hasEnoughQuestions = true;
    let missingParts: string[] = [];

    allSpeakingParts.forEach(part => {
      const eligibleQuestions = allAvailableQuestionsRef.current[part].filter(q =>
        !q.last_used || (now.getTime() - new Date(q.last_used).getTime() > twoHoursInMs)
      );
      if (eligibleQuestions.length < minQuestions[part]) {
        hasEnoughQuestions = false;
        missingParts.push(`${part} (kerak: ${minQuestions[part]}, mavjud: ${eligibleQuestions.length})`);
      }
      selectedQuestionsForTest[part] = getRandomElements(eligibleQuestions, minQuestions[part]);
    });

    if (!hasEnoughQuestions) {
      showError(`Test uchun yetarli savollar mavjud emas: ${missingParts.join(", ")}`);
      return;
    }

    const nowISO = now.toISOString();
    const questionIdsToUpdate = Object.values(selectedQuestionsForTest).flat().map(q => q.id);
    if (questionIdsToUpdate.length > 0) {
      const { error } = await supabase
        .from('speaking_questions')
        .update({ last_used: nowISO })
        .in('id', questionIdsToUpdate);
      if (error) console.error("Failed to update last_used:", error);
    }

    setQuestions(selectedQuestionsForTest);
    setIsStudentInfoFormOpen(true);
  };

  const handleStudentInfoSave = async (id: string, name: string, phone: string) => {
    const newStudentInfo: StudentInfo = { id, name, phone };
    setStudentInfo(newStudentInfo);
    const recordingStarted = await startRecording(newStudentInfo);
    if (recordingStarted) {
      setIsTestStarted(true);
      setCurrentPhase("pre_test_countdown");
      showSuccess("Test boshlanmoqda!");
      setIsStudentInfoFormOpen(false);
    } else {
      setStudentInfo(null);
    }
  };

  const handleEndTest = () => {
    stopAllStreams();
    setIsTestStarted(false);
    setCurrentPhase("finished");
    setStudentInfo(null);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    showSuccess("Mock test tugatildi.");
  };

  const handleResetTest = () => {
    setIsTestStarted(false);
    setCurrentPhase("idle");
    setStudentInfo(null);
    setCurrentPartIndex(0);
    setCurrentQuestionIndex(0);
    setCurrentSubQuestionIndex(0);
    setQuestions({ "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [] });
    loadAllQuestions();
  };

  return {
    isTestStarted, currentPartIndex, currentQuestionIndex, currentSubQuestionIndex,
    currentPhase, countdown, initialCountdown, studentInfo, isStudentInfoFormOpen,
    setIsStudentInfoFormOpen, handleStartTestClick, handleStudentInfoSave,
    handleEndTest, handleResetTest, getCurrentQuestion, allSpeakingParts,
  };
};
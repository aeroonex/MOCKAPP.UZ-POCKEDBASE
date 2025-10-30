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
import { getSupabaseQuestions, updateSupabaseQuestion } from "@/lib/local-db";

const TIMINGS = {
  PRE_TEST_COUNTDOWN: 5,
  PART1_READ_QUESTION: 5, // New: 5 seconds for reading Part 1.1/1.2 questions
  PART1_1_ANSWER: 30, // Renamed from PART1_1_QUESTION
  PART1_2_ANSWER: 30, // Renamed from PART1_2_QUESTION (default for 2nd/3rd sub-questions)
  PART2_PREP: 60,
  PART2_SPEAK: 120,
  PART3_PREP: 60,
  PART3_SPEAK: 120,
  ANNOUNCEMENT_DELAY: 5,
  ANNOUNCEMENT_SPEAK_DURATION: 2,
};

export type TestPhase = "idle" | "pre_test_countdown" | "reading_question" | "preparation" | "speaking" | "part_finished_announcement" | "next_part_announcement" | "finished";

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
  const activeCountdownPhaseRef = useRef<TestPhase | null>(null); // Yangi ref qo'shildi

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
          activeCountdownPhaseRef.current = null; // Hisoblash tugaganda refni tozalash
          nextAction();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [setInitialCountdown, setCountdown]); // setInitialCountdown va setCountdown ni dependency qilib qo'shish

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
      case "Part 1.1":
      case "Part 1.2": {
        const subQCount = (currentQ as Part1_1Question | Part1_2Question).sub_questions.length;
        if (currentPhase === "reading_question") {
          setCurrentPhase("speaking");
        } else if (currentPhase === "speaking") {
          if (currentSubQuestionIndex < subQCount - 1) {
            setCurrentSubQuestionIndex(prev => prev + 1);
            setCurrentPhase("reading_question");
          } else {
            if (currentQuestionIndex < questions[currentPartName].length - 1) {
              setCurrentQuestionIndex(prev => prev + 1);
              setCurrentSubQuestionIndex(0);
              setCurrentPhase("reading_question");
            } else {
              setCurrentPhase("part_finished_announcement");
            }
          }
        } else {
          setCurrentPhase("reading_question");
        }
        break;
      }
      case "Part 2":
      case "Part 3": {
        if (currentPhase === "preparation") setCurrentPhase("speaking");
        else if (currentPhase === "speaking") setCurrentPhase("part_finished_announcement");
        else {
          setCurrentPhase("preparation");
        }
        break;
      }
      default:
        setCurrentPhase("part_finished_announcement");
        break;
    }
  }, [currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, questions, currentPhase, stopAllStreams, getCurrentQuestion]);

  const loadAllQuestions = useCallback(async () => {
    const data = await getSupabaseQuestions();
    const loadedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
      "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
    };
    data.forEach((q: SpeakingQuestion) => {
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
      setInitialCountdown(0);
      activeCountdownPhaseRef.current = null; // Test tugaganda refni tozalash
      return;
    }

    // Agar joriy faza uchun hisoblash allaqachon boshlangan bo'lsa, qayta boshlamang.
    if (activeCountdownPhaseRef.current === currentPhase) {
        return;
    }

    let duration = 0;
    let nextAction: () => void = advanceTest;

    const currentQ = getCurrentQuestion();

    if (currentPhase === "pre_test_countdown") {
      duration = TIMINGS.PRE_TEST_COUNTDOWN;
      nextAction = () => {
        const firstPartWithQuestionsIndex = allSpeakingParts.findIndex(part => questions[part].length > 0);
        if (firstPartWithQuestionsIndex !== -1) {
          setCurrentPartIndex(firstPartWithQuestionsIndex);
          setCurrentQuestionIndex(0);
          setCurrentSubQuestionIndex(0);
          const firstPartName = allSpeakingParts[firstPartWithQuestionsIndex];
          if (firstPartName === "Part 1.1" || firstPartName === "Part 1.2") {
            setCurrentPhase("reading_question");
          } else {
            setCurrentPhase("preparation");
          }
        } else {
          stopAllStreams();
          setIsTestStarted(false);
          setCurrentPhase("finished");
          showError("Mock testni boshlash uchun savollar mavjud emas.");
        }
      };
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
            if (nextPartName === "Part 1.1" || nextPartName === "Part 1.2") {
              setCurrentPhase("reading_question");
            } else {
              setCurrentPhase("preparation");
            }
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
    } else if (currentQ) {
      switch (currentPhase) {
        case "reading_question":
          duration = TIMINGS.PART1_READ_QUESTION;
          nextAction = () => setCurrentPhase("speaking");
          break;
        case "speaking":
          if (currentQ.type === "Part 1.1") {
            duration = TIMINGS.PART1_1_ANSWER;
          } else if (currentQ.type === "Part 1.2") {
            // Part 1.2 uchun birinchi savolga 45 soniya, keyingilariga 30 soniya
            if (currentSubQuestionIndex === 0) {
              duration = 45;
            } else {
              duration = TIMINGS.PART1_2_ANSWER; // 30 soniya
            }
          } else if (currentQ.type === "Part 2") {
            duration = TIMINGS.PART2_SPEAK;
          } else if (currentQ.type === "Part 3") {
            duration = TIMINGS.PART3_SPEAK;
          }
          break;
        case "preparation":
          if (currentQ.type === "Part 2") duration = TIMINGS.PART2_PREP;
          else if (currentQ.type === "Part 3") duration = TIMINGS.PART3_PREP;
          break;
        default:
          duration = 0;
          break;
      }
    } else {
      advanceTest();
      return;
    }

    if (duration > 0) {
        activeCountdownPhaseRef.current = currentPhase; // Joriy fazani faol deb belgilash
        startCountdown(duration, nextAction);
    } else {
        nextAction();
        activeCountdownPhaseRef.current = null; // Agar hisoblash bo'lmasa, refni tozalash
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isTestStarted, currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, currentPhase, questions, startCountdown, advanceTest, stopAllStreams, getCurrentQuestion]);

  useEffect(() => {
    if (!isTestStarted) return;

    const currentQ = getCurrentQuestion();
    if (!currentQ) return;

    if (currentPhase === "reading_question" && (currentQ.type === "Part 1.1" || currentQ.type === "Part 1.2")) {
      const textToSpeak = (currentQ as Part1_1Question | Part1_2Question).sub_questions[currentSubQuestionIndex];
      if (textToSpeak) speakText(textToSpeak, 'en-US');
    } else if (currentPhase === "preparation" && (currentQ.type === "Part 2" || currentQ.type === "Part 3")) {
      speakText((currentQ as Part2Question | Part3Question).question_text, 'en-US');
    } else if (currentPhase === "speaking" && currentQ.type === "Part 2") {
      speakText("Please speak", 'en-US');
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
        !q.last_used || (now.getTime() - new Date(q.last_used!).getTime() > twoHoursInMs)
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

    const questionsToUpdate = Object.values(selectedQuestionsForTest).flat();
    for (const q of questionsToUpdate) {
      await updateSupabaseQuestion({ ...q, last_used: now.toISOString() });
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
      // To'liq ekran rejimiga o'tish
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.error("To'liq ekran rejimiga o'tishda xatolik:", err);
        showError("To'liq ekran rejimiga o'tishda xatolik yuz berdi.");
      }
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
    activeCountdownPhaseRef.current = null; // Test tugaganda refni tozalash
    showSuccess("Mock test tugatildi.");
    // To'liq ekran rejimdan chiqish
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
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
    activeCountdownPhaseRef.current = null; // Test qayta boshlanganda refni tozalash
    // To'liq ekran rejimdan chiqish
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  return {
    isTestStarted, currentPartIndex, currentQuestionIndex, currentSubQuestionIndex,
    currentPhase, countdown, initialCountdown, studentInfo, isStudentInfoFormOpen,
    setIsStudentInfoFormOpen, handleStartTestClick, handleStudentInfoSave,
    handleEndTest, handleResetTest, getCurrentQuestion, allSpeakingParts,
  };
};
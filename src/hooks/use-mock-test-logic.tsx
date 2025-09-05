"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { showSuccess, showError } from "@/utils/toast";
import {
  SpeakingQuestion,
  SpeakingPart,
  StudentInfo,
  Part1Question,
  Part1_1Question,
  Part1_2Question,
  Part2Question,
  Part3Question,
} from "@/lib/types";
import { allSpeakingParts, getSpeakingQuestionStorageKey } from "@/lib/constants";

// Define timings for each phase/part
const TIMINGS = {
  PART1_QUESTION: 30, // seconds
  PART1_1_QUESTION: 30, // seconds
  PART1_2_QUESTION: 30, // seconds for Part 1.2
  PART2_PREP: 60, // seconds
  PART2_SPEAK: 120, // seconds
  PART3_PREP: 60, // seconds
  PART3_SPEAK: 120, // seconds
};

export type TestPhase = "idle" | "preparation" | "speaking" | "question_display" | "finished";

interface UseMockTestLogicProps {
  startRecording: (studentInfo: StudentInfo) => Promise<boolean>;
  stopAllStreams: () => void;
  resetRecordedData: () => void;
}

// Helper function to get N random unique elements from an array
function getRandomElements<T>(arr: T[], num: number): T[] {
  if (arr.length === 0 || num <= 0) return [];
  if (num >= arr.length) return [...arr]; // Return all if num is greater than or equal to array length

  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
}

export const useMockTestLogic = ({
  startRecording,
  stopAllStreams,
  resetRecordedData,
}: UseMockTestLogicProps) => {
  const [isTestStarted, setIsTestStarted] = useState<boolean>(false);
  const [questions, setQuestions] = useState<Record<SpeakingPart, SpeakingQuestion[]>>({
    "Part 1": [],
    "Part 1.1": [],
    "Part 1.2": [],
    "Part 2": [],
    "Part 3": [],
  });
  // Ref to store all available questions from localStorage
  const allAvailableQuestionsRef = useRef<Record<SpeakingPart, SpeakingQuestion[]>>({
    "Part 1": [],
    "Part 1.1": [],
    "Part 1.2": [],
    "Part 2": [],
    "Part 3": [],
  });

  const [currentPartIndex, setCurrentPartIndex] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentSubQuestionIndex, setCurrentSubQuestionIndex] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<TestPhase>("idle");
  const [countdown, setCountdown] = useState<number>(0);
  const [isStudentInfoFormOpen, setIsStudentInfoFormOpen] = useState<boolean>(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  const countdownIntervalRef = useRef<number | null>(null);

  // Helper to get current question based on part and index
  const getCurrentQuestion = useCallback(() => {
    const currentPartName = allSpeakingParts[currentPartIndex];
    return questions[currentPartName]?.[currentQuestionIndex];
  }, [currentPartIndex, currentQuestionIndex, questions]);

  // Function to manage countdown
  const startCountdown = useCallback((duration: number, nextAction: () => void) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
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

  // This function now only determines the NEXT state, it doesn't start countdowns directly
  const advanceTest = useCallback(() => {
    console.log("advanceTest called. Current Part:", allSpeakingParts[currentPartIndex], "Question Index:", currentQuestionIndex, "Sub-Q Index:", currentSubQuestionIndex, "Phase:", currentPhase);
    const currentPartName = allSpeakingParts[currentPartIndex];
    const currentQ = getCurrentQuestion();

    if (!currentQ) {
      console.log("No more questions in current part. Attempting to move to next part.");
      if (currentPartIndex < allSpeakingParts.length - 1) {
        setCurrentPartIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
        setCurrentSubQuestionIndex(0);
        setCurrentPhase("question_display");
      } else {
        console.log("All parts finished.");
        stopAllStreams();
        setIsTestStarted(false);
        setCurrentPhase("finished");
        showSuccess("Mock test yakunlandi!");
      }
      return;
    }

    switch (currentQ.type) {
      case "part1": {
        console.log("Part 1 question finished. Checking for next Part 1 question.");
        if (currentQuestionIndex < questions[currentPartName].length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setCurrentPhase("question_display");
        } else {
          setCurrentPartIndex(prev => prev + 1);
          setCurrentQuestionIndex(0);
          setCurrentSubQuestionIndex(0);
          setCurrentPhase("question_display");
        }
        break;
      }
      case "part1.1": {
        console.log("Part 1.1 sub-question finished. Checking for next sub-question or next part.");
        const part1_1Q = currentQ as Part1_1Question;
        if (currentSubQuestionIndex < part1_1Q.subQuestions.length - 1) {
          setCurrentSubQuestionIndex(prev => prev + 1);
          setCurrentPhase("question_display");
        } else {
          if (currentQuestionIndex < questions[currentPartName].length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentSubQuestionIndex(0);
            setCurrentPhase("question_display");
          } else {
            setCurrentPartIndex(prev => prev + 1);
            setCurrentQuestionIndex(0);
            setCurrentSubQuestionIndex(0);
            setCurrentPhase("question_display");
          }
        }
        break;
      }
      case "part1.2": {
        console.log("Part 1.2 sub-question finished. Checking for next sub-question or next image/part.");
        const part1_2Q = currentQ as Part1_2Question;
        if (currentSubQuestionIndex < part1_2Q.subQuestions.length - 1) {
          setCurrentSubQuestionIndex(prev => prev + 1);
          setCurrentPhase("question_display");
        } else {
          if (currentQuestionIndex < questions[currentPartName].length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentSubQuestionIndex(0);
            setCurrentPhase("question_display");
          } else {
            setCurrentPartIndex(prev => prev + 1);
            setCurrentQuestionIndex(0);
            setCurrentSubQuestionIndex(0);
            setCurrentPhase("question_display");
          }
        }
        break;
      }
      case "part2": {
        console.log("Part 2 phase transition. Current phase:", currentPhase);
        if (currentPhase === "question_display") {
          setCurrentPhase("preparation");
        } else if (currentPhase === "preparation") {
          setCurrentPhase("speaking");
        } else if (currentPhase === "speaking") {
          setCurrentPartIndex(prev => prev + 1);
          setCurrentQuestionIndex(0);
          setCurrentSubQuestionIndex(0);
          setCurrentPhase("question_display");
        }
        break;
      }
      case "part3": {
        console.log("Part 3 phase transition. Current phase:", currentPhase);
        if (currentPhase === "question_display") {
          setCurrentPhase("preparation");
        } else if (currentPhase === "preparation") {
          setCurrentPhase("speaking");
        } else if (currentPhase === "speaking") {
          setCurrentPartIndex(prev => prev + 1);
          setCurrentQuestionIndex(0);
          setCurrentSubQuestionIndex(0);
          setCurrentPhase("question_display");
        }
        break;
      }
      default:
        console.warn("Unknown question type encountered:", (currentQ as any).type);
        setCurrentPartIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
        setCurrentSubQuestionIndex(0);
        setCurrentPhase("question_display");
        break;
    }
  }, [currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, questions, currentPhase, stopAllStreams, getCurrentQuestion]);

  // Load ALL questions from localStorage on component mount into the ref
  useEffect(() => {
    const loadAllQuestions = () => {
      const loadedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
        "Part 1": [], "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
      };
      allSpeakingParts.forEach(part => {
        const storageKey = getSpeakingQuestionStorageKey(part);
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          loadedQuestions[part] = JSON.parse(stored);
        }
      });
      allAvailableQuestionsRef.current = loadedQuestions;
      console.log("MockTest: All available questions loaded from localStorage:", loadedQuestions);
    };
    loadAllQuestions();
  }, []);

  // Effect to manage countdowns based on current test state
  useEffect(() => {
    if (!isTestStarted || currentPhase === "idle" || currentPhase === "finished") {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    const currentPartName = allSpeakingParts[currentPartIndex];
    const currentQ = questions[currentPartName]?.[currentQuestionIndex];

    if (!currentQ) {
      console.log("MockTest: No current question found in useEffect, attempting to advance.");
      advanceTest();
      return;
    }

    let duration = 0;
    switch (currentQ.type) {
      case "part1":
        duration = TIMINGS.PART1_QUESTION;
        break;
      case "part1.1":
        duration = TIMINGS.PART1_1_QUESTION;
        break;
      case "part1.2":
        duration = TIMINGS.PART1_2_QUESTION;
        break;
      case "part2":
        duration = currentPhase === "preparation" ? TIMINGS.PART2_PREP : TIMINGS.PART2_SPEAK;
        break;
      case "part3":
        duration = currentPhase === "preparation" ? TIMINGS.PART3_PREP : TIMINGS.PART3_SPEAK;
        break;
    }

    if (duration > 0) {
      console.log(`MockTest: Starting countdown for ${currentPartName}, Q${currentQuestionIndex + 1}, Phase: ${currentPhase} with duration ${duration}s.`);
      startCountdown(duration, advanceTest);
    } else {
      console.warn("MockTest: Duration is 0 for current phase, advancing immediately.");
      advanceTest();
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [isTestStarted, currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, currentPhase, questions, startCountdown, advanceTest]);

  // Effect to start the test flow when isTestStarted becomes true and phase is idle
  useEffect(() => {
    if (isTestStarted && currentPhase === "idle") {
      console.log("MockTest: Starting test flow from idle. Current questions state:", questions);

      const totalQuestions = allSpeakingParts.reduce((sum, part) => sum + questions[part].length, 0);
      if (totalQuestions === 0) {
        showError("Mock testni boshlash uchun savollar mavjud emas. Iltimos, avval savollar qo'shing.");
        setIsTestStarted(false);
        setStudentInfo(null);
        return;
      }

      let firstPartWithQuestionsIndex = -1;
      for (let i = 0; i < allSpeakingParts.length; i++) {
        if (questions[allSpeakingParts[i]].length > 0) {
          firstPartWithQuestionsIndex = i;
          break;
        }
      }

      if (firstPartWithQuestionsIndex === -1) {
        showError("Mock testni boshlash uchun savollar mavjud emas. Iltimos, avval savollar qo'shing.");
        setIsTestStarted(false);
        setStudentInfo(null);
        return;
      }

      setCurrentPartIndex(firstPartWithQuestionsIndex);
      setCurrentQuestionIndex(0);
      setCurrentSubQuestionIndex(0);
      const firstQuestion = questions[allSpeakingParts[firstPartWithQuestionsIndex]]?.[0];
      if (firstQuestion && (firstQuestion.type === "part2" || firstQuestion.type === "part3")) {
        setCurrentPhase("preparation");
      } else {
        setCurrentPhase("question_display");
      }
    }
  }, [isTestStarted, currentPhase, questions]);

  const handleStartTestClick = () => {
    const selectedQuestionsForTest: Record<SpeakingPart, SpeakingQuestion[]> = {
      "Part 1": [], "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
    };

    // Part 1: Select 3 random questions
    selectedQuestionsForTest["Part 1"] = getRandomElements(allAvailableQuestionsRef.current["Part 1"] as Part1Question[], 3);

    // Part 1.1: Select 1 random question object, then 3 random sub-questions from it
    const randomPart1_1Q = getRandomElements(allAvailableQuestionsRef.current["Part 1.1"] as Part1_1Question[], 1)[0];
    if (randomPart1_1Q) {
      const selectedSubQuestions = getRandomElements(randomPart1_1Q.subQuestions, 3);
      selectedQuestionsForTest["Part 1.1"] = [{ ...randomPart1_1Q, subQuestions: selectedSubQuestions }];
    }

    // Part 1.2: Select 1 random question object, then 3 random sub-questions from it
    const randomPart1_2Q = getRandomElements(allAvailableQuestionsRef.current["Part 1.2"] as Part1_2Question[], 1)[0];
    if (randomPart1_2Q) {
      const selectedSubQuestions = getRandomElements(randomPart1_2Q.subQuestions, 3);
      selectedQuestionsForTest["Part 1.2"] = [{ ...randomPart1_2Q, subQuestions: selectedSubQuestions }];
    }

    // Part 2: Select 1 random question
    selectedQuestionsForTest["Part 2"] = getRandomElements(allAvailableQuestionsRef.current["Part 2"] as Part2Question[], 1);

    // Part 3: Select 1 random question
    selectedQuestionsForTest["Part 3"] = getRandomElements(allAvailableQuestionsRef.current["Part 3"] as Part3Question[], 1);

    // Filter out empty parts and check if any questions were selected
    const totalSelectedQuestions = allSpeakingParts.reduce((sum, part) => sum + selectedQuestionsForTest[part].length, 0);
    if (totalSelectedQuestions === 0) {
      showError("Mock testni boshlash uchun savollar mavjud emas. Iltimos, avval savollar qo'shing.");
      return;
    }

    setQuestions(selectedQuestionsForTest); // Update the questions state with the randomly selected ones
    console.log("MockTest: Randomly selected questions for this test:", selectedQuestionsForTest);

    setIsStudentInfoFormOpen(true);
  };

  const handleStudentInfoSave = async (id: string, name: string, phone: string) => {
    const newStudentInfo: StudentInfo = { id, name, phone };
    setStudentInfo(newStudentInfo);

    const recordingStartedSuccessfully = await startRecording(newStudentInfo);
    if (!recordingStartedSuccessfully) {
      setStudentInfo(null);
      setIsStudentInfoFormOpen(false);
      return;
    }

    setIsTestStarted(true);
    setCurrentPhase("idle"); // This will trigger the useEffect to start the test flow
    showSuccess("Mock test boshlandi!");
    setIsStudentInfoFormOpen(false); // Close form after saving and starting
  };

  const handleEndTest = () => {
    stopAllStreams();
    setIsTestStarted(false);
    setCurrentPhase("finished");
    setStudentInfo(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    showSuccess("Mock test tugatildi.");
  };

  const handleResetTest = () => {
    setIsTestStarted(false);
    setCurrentPhase("idle");
    resetRecordedData();
    setStudentInfo(null);
    setCurrentPartIndex(0);
    setCurrentQuestionIndex(0);
    setCurrentSubQuestionIndex(0);
    // Clear the questions state to ensure a fresh selection on next start
    setQuestions({
      "Part 1": [],
      "Part 1.1": [],
      "Part 1.2": [],
      "Part 2": [],
      "Part 3": [],
    });
  };

  return {
    isTestStarted,
    currentPartIndex,
    currentQuestionIndex,
    currentSubQuestionIndex,
    currentPhase,
    countdown,
    questions,
    studentInfo,
    isStudentInfoFormOpen,
    setIsStudentInfoFormOpen,
    handleStartTestClick,
    handleStudentInfoSave,
    handleEndTest,
    handleResetTest,
    getCurrentQuestion,
    allSpeakingParts,
  };
};
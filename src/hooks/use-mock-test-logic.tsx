"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { speakText } from "@/utils/audioUtils"; // Yangi audio utilitini import qilish
import {
  SpeakingQuestion,
  SpeakingPart,
  StudentInfo,
  Part1_1Question,
  Part1_2Question,
  Part2Question,
  Part3Question,
} from "@/lib/types";
import { allSpeakingParts, getSpeakingQuestionStorageKey } from "@/lib/constants";

// Define timings for each phase/part
const TIMINGS = {
  PRE_TEST_COUNTDOWN: 5, // New: 5 seconds before test officially starts
  PART1_1_QUESTION: 30, // seconds
  PART1_2_QUESTION: 30, // seconds for Part 1.2
  PART2_PREP: 60, // seconds
  PART2_SPEAK: 120, // seconds
  PART3_PREP: 60, // seconds
  PART3_SPEAK: 120, // seconds
  ANNOUNCEMENT_DELAY: 5, // Delay between "Part X Finished" and "Part Y"
  ANNOUNCEMENT_SPEAK_DURATION: 2, // Estimated time for the speech synthesis to complete
};

export type TestPhase = "idle" | "pre_test_countdown" | "preparation" | "speaking" | "question_display" | "part_finished_announcement" | "next_part_announcement" | "finished";

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
    "Part 1.1": [],
    "Part 1.2": [],
    "Part 2": [],
    "Part 3": [],
  });
  // Ref to store all available questions from localStorage
  const allAvailableQuestionsRef = useRef<Record<SpeakingPart, SpeakingQuestion[]>>({
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
    console.log("--- advanceTest START ---");
    console.log("Initial state in advanceTest:", { currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, currentPhase });
    const currentPartName = allSpeakingParts[currentPartIndex];
    const currentQ = getCurrentQuestion();
    console.log("Current Question in advanceTest:", currentQ ? { id: currentQ.id, type: currentQ.type } : "None");

    if (!currentQ) {
      console.log("No more questions in current part. Attempting to move to next part.");
      if (currentPartIndex < allSpeakingParts.length - 1) {
        console.log(`Advancing to next part from index ${currentPartIndex} to ${currentPartIndex + 1}`);
        setCurrentPhase("part_finished_announcement"); // Announce current part finished
      } else {
        console.log("All parts finished. Stopping streams and ending test.");
        stopAllStreams();
        setIsTestStarted(false);
        setCurrentPhase("finished");
        showSuccess("Mock test yakunlandi!");
      }
      console.log("--- advanceTest END (no currentQ) ---");
      return;
    }

    switch (currentQ.type) {
      case "part1.1": {
        console.log("Handling Part 1.1. Current sub-question index:", currentSubQuestionIndex);
        const part1_1Q = currentQ as Part1_1Question;
        if (currentSubQuestionIndex < part1_1Q.subQuestions.length - 1) {
          console.log("Moving to next sub-question in Part 1.1");
          setCurrentSubQuestionIndex(prev => prev + 1);
          setCurrentPhase("question_display");
        } else {
          console.log("All sub-questions in Part 1.1 finished. Moving to next question or part.");
          if (currentQuestionIndex < questions[currentPartName].length - 1) {
            console.log("Moving to next question in Part 1.1");
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentSubQuestionIndex(0);
            setCurrentPhase("question_display");
          } else {
            console.log("All questions in Part 1.1 finished. Moving to next part.");
            setCurrentPhase("part_finished_announcement"); // Announce current part finished
          }
        }
        break;
      }
      case "part1.2": {
        console.log("Handling Part 1.2. Current sub-question index:", currentSubQuestionIndex);
        const part1_2Q = currentQ as Part1_2Question;
        if (currentSubQuestionIndex < part1_2Q.subQuestions.length - 1) {
          console.log("Moving to next sub-question in Part 1.2");
          setCurrentSubQuestionIndex(prev => prev + 1);
          setCurrentPhase("question_display");
        } else {
          console.log("All sub-questions in Part 1.2 finished. Moving to next question or part.");
          if (currentQuestionIndex < questions[currentPartName].length - 1) {
            console.log("Moving to next question in Part 1.2");
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentSubQuestionIndex(0);
            setCurrentPhase("question_display");
          } else {
            console.log("All questions in Part 1.2 finished. Moving to next part.");
            setCurrentPhase("part_finished_announcement"); // Announce current part finished
          }
        }
        break;
      }
      case "part2": {
        console.log("Handling Part 2. Current phase:", currentPhase);
        if (currentPhase === "question_display") {
          console.log("Part 2: Transitioning to preparation phase.");
          setCurrentPhase("preparation");
        } else if (currentPhase === "preparation") {
          console.log("Part 2: Transitioning to speaking phase.");
          setCurrentPhase("speaking");
        } else if (currentPhase === "speaking") {
          console.log("Part 2: Speaking phase finished. Moving to next part.");
          setCurrentPhase("part_finished_announcement"); // Announce current part finished
        }
        break;
      }
      case "part3": {
        console.log("Handling Part 3. Current phase:", currentPhase);
        if (currentPhase === "question_display") {
          console.log("Part 3: Transitioning to preparation phase.");
          setCurrentPhase("preparation");
        } else if (currentPhase === "preparation") {
          console.log("Part 3: Transitioning to speaking phase.");
          setCurrentPhase("speaking");
        } else if (currentPhase === "speaking") {
          console.log("Part 3: Speaking phase finished. Moving to next part (or ending test).");
          setCurrentPhase("part_finished_announcement"); // Announce current part finished
        }
        break;
      }
      default:
        console.warn("Unknown question type encountered:", (currentQ as any).type);
        setCurrentPhase("part_finished_announcement"); // Treat as part finished to advance
        break;
    }
    console.log("--- advanceTest END ---");
  }, [currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, questions, currentPhase, stopAllStreams, getCurrentQuestion]);

  // Load ALL questions from localStorage on component mount into the ref
  useEffect(() => {
    const loadAllQuestions = () => {
      const loadedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
        "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
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
    console.log("--- Countdown useEffect START ---");
    console.log("State in Countdown useEffect:", { isTestStarted, currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, currentPhase });

    if (!isTestStarted || currentPhase === "idle" || currentPhase === "finished") {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      console.log("Countdown useEffect: Test not started, idle, or finished. Returning.");
      return;
    }

    let duration = 0;
    let nextAction: () => void;

    if (currentPhase === "pre_test_countdown") {
      duration = TIMINGS.PRE_TEST_COUNTDOWN;
      nextAction = () => {
        console.log("Pre-test countdown finished. Setting phase to idle to trigger test start.");
        setCurrentPhase("idle"); // This will trigger the other useEffect to start the actual test flow
      };
    } else if (currentPhase === "part_finished_announcement") {
      const finishedPartName = allSpeakingParts[currentPartIndex];
      speakText(`${finishedPartName} finished.`, 'en-US');
      duration = TIMINGS.ANNOUNCEMENT_DELAY; // Delay before announcing next part
      nextAction = () => {
        setCurrentPartIndex(prev => prev + 1); // Advance part index for the next announcement
        setCurrentQuestionIndex(0);
        setCurrentSubQuestionIndex(0);
        setCurrentPhase("next_part_announcement");
      };
    } else if (currentPhase === "next_part_announcement") {
      const nextPartName = allSpeakingParts[currentPartIndex]; // currentPartIndex has already been incremented
      if (nextPartName) {
        speakText(`${nextPartName}`, 'en-US');
        duration = TIMINGS.ANNOUNCEMENT_SPEAK_DURATION; // Estimated time for the speech synthesis to complete
        nextAction = () => {
          // After announcement, check if there are questions for this new part
          if (questions[nextPartName] && questions[nextPartName].length > 0) {
            const firstQuestion = questions[nextPartName][0];
            if (firstQuestion.type === "part2" || firstQuestion.type === "part3") {
              setCurrentPhase("question_display"); // Start with question display, then it will advance to preparation
            } else {
              setCurrentPhase("question_display");
            }
          } else {
            // If no questions in this part, try to advance again (skip this empty part)
            console.log(`No questions found for ${nextPartName}. Advancing to next part.`);
            advanceTest(); // This will trigger part_finished_announcement for the current (empty) part
          }
        };
      } else {
        // No more parts to announce, end the test
        stopAllStreams();
        setIsTestStarted(false);
        setCurrentPhase("finished");
        showSuccess("Mock test yakunlandi!");
        duration = 0;
        nextAction = () => {};
      }
    } else {
      const currentPartName = allSpeakingParts[currentPartIndex];
      const currentQ = questions[currentPartName]?.[currentQuestionIndex];
      console.log("Countdown useEffect: Current Question:", currentQ ? { id: currentQ.id, type: currentQ.type } : "None");

      if (!currentQ) {
        console.log("Countdown useEffect: No current question found, attempting to advance.");
        advanceTest();
        console.log("Countdown useEffect: After advanceTest call (no currentQ).");
        return;
      }

      // Special handling for Part 2 and Part 3 when in 'question_display' phase
      if (currentQ.type === "part2" || currentQ.type === "part3") {
        if (currentPhase === "question_display") {
          // No countdown for just displaying the question, immediately advance to preparation
          duration = 0; // Set to 0 to immediately trigger nextAction
          nextAction = advanceTest;
        } else if (currentPhase === "preparation") {
          duration = currentQ.type === "part2" ? TIMINGS.PART2_PREP : TIMINGS.PART3_PREP;
          nextAction = advanceTest;
        } else if (currentPhase === "speaking") {
          duration = currentQ.type === "part2" ? TIMINGS.PART2_SPEAK : TIMINGS.PART3_SPEAK;
          nextAction = advanceTest;
        } else {
          console.warn(`Countdown useEffect: Unexpected phase for ${currentQ.type}: ${currentPhase}. Advancing immediately.`);
          duration = 0;
          nextAction = advanceTest;
        }
      } else { // Part 1.1, Part 1.2
        duration = currentQ.type === "part1.1" ? TIMINGS.PART1_1_QUESTION : TIMINGS.PART1_2_QUESTION;
        nextAction = advanceTest;
      }
    }

    if (duration > 0) {
      console.log(`Countdown useEffect: Starting countdown for Phase: ${currentPhase} with duration ${duration}s.`);
      startCountdown(duration, nextAction);
    } else {
      console.warn("Countdown useEffect: Duration is 0 for current phase, advancing immediately.");
      nextAction();
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        console.log("Countdown useEffect: Cleanup - interval cleared.");
      }
    };
  }, [isTestStarted, currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, currentPhase, questions, startCountdown, advanceTest, stopAllStreams]);

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
      setCurrentPhase("question_display"); // Start with question display, then it will advance to preparation
    }
  }, [isTestStarted, currentPhase, questions]);

  const handleStartTestClick = () => {
    console.log("handleStartTestClick: Tugma bosildi.");
    console.log("handleStartTestClick: allAvailableQuestionsRef.current:", allAvailableQuestionsRef.current);

    const selectedQuestionsForTest: Record<SpeakingPart, SpeakingQuestion[]> = {
      "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
    };

    // Part 1.1: Select 1 random question object (which includes its sub-questions)
    const randomPart1_1Q = getRandomElements(allAvailableQuestionsRef.current["Part 1.1"] as Part1_1Question[], 1)[0];
    if (randomPart1_1Q) {
      selectedQuestionsForTest["Part 1.1"] = [randomPart1_1Q];
    }
    console.log("handleStartTestClick: selectedQuestionsForTest (Part 1.1):", selectedQuestionsForTest["Part 1.1"]);

    // Part 1.2: Select 1 random question object (which includes its images and sub-questions)
    const randomPart1_2Q = getRandomElements(allAvailableQuestionsRef.current["Part 1.2"] as Part1_2Question[], 1)[0];
    if (randomPart1_2Q) {
      selectedQuestionsForTest["Part 1.2"] = [randomPart1_2Q];
    }
    console.log("handleStartTestClick: selectedQuestionsForTest (Part 1.2):", selectedQuestionsForTest["Part 1.2"]);

    // Part 2: Select 1 random question
    selectedQuestionsForTest["Part 2"] = getRandomElements(allAvailableQuestionsRef.current["Part 2"] as Part2Question[], 1);
    console.log("handleStartTestClick: selectedQuestionsForTest (Part 2):", selectedQuestionsForTest["Part 2"]);

    // Part 3: Select 1 random question
    selectedQuestionsForTest["Part 3"] = getRandomElements(allAvailableQuestionsRef.current["Part 3"] as Part3Question[], 1);
    console.log("handleStartTestClick: selectedQuestionsForTest (Part 3):", selectedQuestionsForTest["Part 3"]);

    // Filter out empty parts and check if any questions were selected
    const totalSelectedQuestions = allSpeakingParts.reduce((sum, part) => sum + selectedQuestionsForTest[part].length, 0);
    console.log("handleStartTestClick: totalSelectedQuestions:", totalSelectedQuestions);

    if (totalSelectedQuestions === 0) {
      showError("Mock testni boshlash uchun savollar mavjud emas. Iltimos, avval savollar qo'shing.");
      return;
    }

    setQuestions(selectedQuestionsForTest); // Update the questions state with the randomly selected ones
    console.log("MockTest: Randomly selected questions for this test:", selectedQuestionsForTest);

    setIsStudentInfoFormOpen(true);
    console.log("handleStartTestClick: isStudentInfoFormOpen set to true."); // NEW LOG
  };

  const handleStudentInfoSave = async (id: string, name: string, phone: string) => {
    console.log("handleStudentInfoSave: Ma'lumotlar saqlanmoqda:", { id, name, phone });
    const newStudentInfo: StudentInfo = { id, name, phone };
    setStudentInfo(newStudentInfo);

    const recordingStartedSuccessfully = await startRecording(newStudentInfo);
    console.log("handleStudentInfoSave: Yozib olish muvaffaqiyatli boshlandimi:", recordingStartedSuccessfully);

    if (!recordingStartedSuccessfully) {
      setStudentInfo(null);
      setIsStudentInfoFormOpen(false);
      return;
    }

    setIsTestStarted(true);
    setCurrentPhase("pre_test_countdown"); // Start pre-test countdown
    showSuccess("Mock test boshlanishiga tayyorlanmoqda!");
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
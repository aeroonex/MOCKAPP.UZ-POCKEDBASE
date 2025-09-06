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
  const [initialCountdown, setInitialCountdown] = useState<number>(0); // New state for initial duration
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
    setInitialCountdown(duration); // Set the initial duration for the progress bar
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
    // console.log("--- advanceTest START ---"); // Removed debug log
    // console.log("Initial state in advanceTest:", { currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, currentPhase }); // Removed debug log
    const currentPartName = allSpeakingParts[currentPartIndex];
    const currentQ = getCurrentQuestion();
    // console.log("Current Question in advanceTest:", currentQ ? { id: currentQ.id, type: currentQ.type } : "None"); // Removed debug log

    if (!currentQ) {
      // console.log("No more questions in current part. Attempting to move to next part."); // Removed debug log
      if (currentPartIndex < allSpeakingParts.length - 1) {
        // console.log(`Advancing to next part from index ${currentPartIndex} to ${currentPartIndex + 1}`); // Removed debug log
        setCurrentPhase("part_finished_announcement"); // Announce current part finished
      } else {
        // console.log("All parts finished. Stopping streams and ending test."); // Removed debug log
        stopAllStreams();
        setIsTestStarted(false);
        setCurrentPhase("finished");
        showSuccess("Mock test yakunlandi!");
      }
      // console.log("--- advanceTest END (no currentQ) ---"); // Removed debug log
      return;
    }

    switch (currentQ.type) {
      case "part1.1": {
        // console.log("Handling Part 1.1. Current sub-question index:", currentSubQuestionIndex); // Removed debug log
        const part1_1Q = currentQ as Part1_1Question;
        if (currentSubQuestionIndex < part1_1Q.subQuestions.length - 1) {
          // console.log("Moving to next sub-question in Part 1.1"); // Removed debug log
          setCurrentSubQuestionIndex(prev => prev + 1);
          setCurrentPhase("question_display");
        } else {
          // console.log("All sub-questions in Part 1.1 finished. Moving to next question or part."); // Removed debug log
          if (currentQuestionIndex < questions[currentPartName].length - 1) {
            // console.log("Moving to next question in Part 1.1"); // Removed debug log
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentSubQuestionIndex(0);
            setCurrentPhase("question_display");
          } else {
            // console.log("All questions in Part 1.1 finished. Moving to next part."); // Removed debug log
            setCurrentPhase("part_finished_announcement"); // Announce current part finished
          }
        }
        break;
      }
      case "part1.2": {
        // console.log("Handling Part 1.2. Current sub-question index:", currentSubQuestionIndex); // Removed debug log
        const part1_2Q = currentQ as Part1_2Question;
        if (currentSubQuestionIndex < part1_2Q.subQuestions.length - 1) {
          // console.log("Moving to next sub-question in Part 1.2"); // Removed debug log
          setCurrentSubQuestionIndex(prev => prev + 1);
          setCurrentPhase("question_display");
        } else {
          // console.log("All sub-questions in Part 1.2 finished. Moving to next question or part."); // Removed debug log
          if (currentQuestionIndex < questions[currentPartName].length - 1) {
            // console.log("Moving to next question in Part 1.2"); // Removed debug log
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentSubQuestionIndex(0);
            setCurrentPhase("question_display");
          } else {
            // console.log("All questions in Part 1.2 finished. Moving to next part."); // Removed debug log
            setCurrentPhase("part_finished_announcement"); // Announce current part finished
          }
        }
        break;
      }
      case "part2": {
        // console.log("Handling Part 2. Current phase:", currentPhase); // Removed debug log
        if (currentPhase === "question_display") {
          // console.log("Part 2: Transitioning to preparation phase."); // Removed debug log
          setCurrentPhase("preparation");
        } else if (currentPhase === "preparation") {
          // console.log("Part 2: Transitioning to speaking phase."); // Removed debug log
          setCurrentPhase("speaking");
        } else if (currentPhase === "speaking") {
          // console.log("Part 2: Speaking phase finished. Moving to next part."); // Removed debug log
          setCurrentPhase("part_finished_announcement"); // Announce current part finished
        }
        break;
      }
      case "part3": {
        // console.log("Handling Part 3. Current phase:", currentPhase); // Removed debug log
        if (currentPhase === "question_display") {
          // console.log("Part 3: Transitioning to preparation phase."); // Removed debug log
          setCurrentPhase("preparation");
        } else if (currentPhase === "preparation") {
          // console.log("Part 3: Transitioning to speaking phase."); // Removed debug log
          setCurrentPhase("speaking");
        } else if (currentPhase === "speaking") {
          // console.log("Part 3: Speaking phase finished. Moving to next part (or ending test)."); // Removed debug log
          setCurrentPhase("part_finished_announcement"); // Announce current part finished
        }
        break;
      }
      default:
        console.warn("Unknown question type encountered:", (currentQ as any).type);
        setCurrentPhase("part_finished_announcement"); // Treat as part finished to advance
        break;
    }
    // console.log("--- advanceTest END ---"); // Removed debug log
  }, [currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, questions, currentPhase, stopAllStreams, getCurrentQuestion]);

  // Function to load ALL questions from localStorage into the ref
  const loadAllQuestions = useCallback(() => {
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
    // console.log("MockTest: All available questions loaded from localStorage:", loadedQuestions); // Removed debug log
  }, []);

  // Initial load on mount
  useEffect(() => {
    loadAllQuestions();
  }, [loadAllQuestions]);


  // Effect to manage countdowns based on current test state
  useEffect(() => {
    // console.log("--- Countdown useEffect START ---"); // Removed debug log
    // console.log("State in Countdown useEffect:", { isTestStarted, currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, currentPhase }); // Removed debug log

    if (!isTestStarted || currentPhase === "idle" || currentPhase === "finished") {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      // console.log("Countdown useEffect: Test not started, idle, or finished. Returning."); // Removed debug log
      return;
    }

    let duration = 0;
    let nextAction: () => void;

    if (currentPhase === "pre_test_countdown") {
      duration = TIMINGS.PRE_TEST_COUNTDOWN;
      nextAction = () => {
        // console.log("Pre-test countdown finished. Setting phase to idle to trigger test start."); // Removed debug log
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
            // console.log(`No questions found for ${nextPartName}. Advancing to next part.`); // Removed debug log
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
      // console.log("Countdown useEffect: Current Question:", currentQ ? { id: currentQ.id, type: currentQ.type } : "None"); // Removed debug log

      if (!currentQ) {
        // console.log("Countdown useEffect: No current question found, attempting to advance."); // Removed debug log
        advanceTest();
        // console.log("Countdown useEffect: After advanceTest call (no currentQ)."); // Removed debug log
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
      // console.log(`Countdown useEffect: Starting countdown for Phase: ${currentPhase} with duration ${duration}s.`); // Removed debug log
      startCountdown(duration, nextAction);
    } else {
      console.warn("Countdown useEffect: Duration is 0 for current phase, advancing immediately.");
      nextAction();
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        // console.log("Countdown useEffect: Cleanup - interval cleared."); // Removed debug log
      }
    };
  }, [isTestStarted, currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, currentPhase, questions, startCountdown, advanceTest, stopAllStreams]);

  // Effect to start the test flow when isTestStarted becomes true and phase is idle
  useEffect(() => {
    if (isTestStarted && currentPhase === "idle") {
      // console.log("MockTest: Starting test flow from idle. Current questions state:", questions); // Removed debug log

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

  // NEW useEffect to speak the question when it's displayed
  useEffect(() => {
    if (isTestStarted && currentPhase === "question_display") {
      const currentPartName = allSpeakingParts[currentPartIndex];
      
      if (!currentPartName || !questions[currentPartName]) {
        console.warn(`Speaking useEffect: Invalid part name or no questions for part: ${currentPartName}`);
        return;
      }

      const currentQ = questions[currentPartName]?.[currentQuestionIndex];

      if (currentQ) {
        let textToSpeak = "";
        if (currentQ.type === "part1.1" || currentQ.type === "part1.2") {
          textToSpeak = (currentQ as Part1_1Question | Part1_2Question).subQuestions[currentSubQuestionIndex];
        } else if (currentQ.type === "part2" || currentQ.type === "part3") {
          textToSpeak = (currentQ as Part2Question | Part3Question).question;
        }

        if (textToSpeak) {
          // console.log(`Speaking question: "${textToSpeak}"`); // Removed debug log
          speakText(textToSpeak, 'en-US'); 
        }
      } else {
        console.warn("Speaking useEffect: currentQ is undefined, cannot speak question.");
      }
    }
  }, [isTestStarted, currentPhase, currentSubQuestionIndex, currentPartIndex, currentQuestionIndex, questions]);


  const handleStartTestClick = () => {
    // console.log("handleStartTestClick: Tugma bosildi."); // Removed debug log
    
    // Har safar test boshlanganda savollarni localStorage'dan qayta yuklash
    loadAllQuestions();
    // console.log("handleStartTestClick: allAvailableQuestionsRef.current (reloaded):", allAvailableQuestionsRef.current); // Removed debug log

    const selectedQuestionsForTest: Record<SpeakingPart, SpeakingQuestion[]> = {
      "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
    };

    // Minimal savollar sonini tekshirish
    const minQuestions: Record<SpeakingPart, number> = {
      "Part 1.1": 3,
      "Part 1.2": 1,
      "Part 2": 1,
      "Part 3": 1,
    };

    const now = new Date(); // Get current time once
    const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    // console.log("handleStartTestClick: Current time (ISO):", now.toISOString()); // Removed debug log

    let hasEnoughQuestions = true;
    let missingParts: string[] = [];

    allSpeakingParts.forEach(part => {
      // console.log(`--- Filtering for ${part} ---`); // Removed debug log
      const eligibleQuestions = allAvailableQuestionsRef.current[part].filter(q => {
        if (!q.lastUsed) {
          // console.log(`Question ${q.id.substring(0, 8)}... in ${part}: No lastUsed, eligible.`); // Removed debug log
          return true; // Agar hech qachon ishlatilmagan bo'lsa, u mos keladi
        }
        const lastUsedDate = new Date(q.lastUsed);
        const timeSinceLastUse = now.getTime() - lastUsedDate.getTime();
        const isEligible = timeSinceLastUse > twoHoursInMs; // Eligible if used more than 2 hours ago
        // console.log(`Question ${q.id.substring(0, 8)}... in ${part}: lastUsed: ${q.lastUsed}, timeSinceLastUse (ms): ${timeSinceLastUse}, isEligible: ${isEligible}`); // Removed debug log
        return isEligible;
      });

      // console.log(`Part ${part}: Eligible questions count: ${eligibleQuestions.length}`); // Removed debug log
      
      const available = eligibleQuestions.length;
      const required = minQuestions[part];
      if (available < required) {
        hasEnoughQuestions = false;
        missingParts.push(`${part} (kerak: ${required}, mavjud: ${available} (oxirgi 2 soatda ishlatilmagan))`);
      }
      // Tanlangan savollarni eligibleQuestions ichidan olish
      selectedQuestionsForTest[part] = getRandomElements(eligibleQuestions as any[], required);
      // console.log(`Part ${part}: Selected questions for test:`, selectedQuestionsForTest[part].map(q => q.id.substring(0, 8) + '...')); // Removed debug log
    });

    if (!hasEnoughQuestions) {
      showError(`Mock testni boshlash uchun yetarli savollar mavjud emas. Iltimos, quyidagi bo'limlarga savollar qo'shing: ${missingParts.join(", ")}`);
      return;
    }

    // Tanlangan savollarning lastUsed xususiyatini yangilash va localStorage'ga saqlash
    const nowISO = now.toISOString(); // Use the same 'now' for updating lastUsed
    const updatedAllQuestions: Record<SpeakingPart, SpeakingQuestion[]> = { ...allAvailableQuestionsRef.current };

    allSpeakingParts.forEach(part => {
      selectedQuestionsForTest[part].forEach(selectedQ => {
        const indexInAll = updatedAllQuestions[part].findIndex(q => q.id === selectedQ.id);
        if (indexInAll !== -1) {
          updatedAllQuestions[part][indexInAll] = { ...updatedAllQuestions[part][indexInAll], lastUsed: nowISO };
          // console.log(`Updated lastUsed for question ${selectedQ.id.substring(0, 8)}... in ${part} to ${nowISO}`); // Removed debug log
        }
      });
      // Yangilangan ro'yxatni localStorage'ga saqlash
      localStorage.setItem(getSpeakingQuestionStorageKey(part), JSON.stringify(updatedAllQuestions[part]));
      // console.log(`Saved updated questions for ${part} to localStorage. Current state of questions for ${part}:`, updatedAllQuestions[part].map(q => ({id: q.id.substring(0,8)+'...', lastUsed: q.lastUsed}))); // Removed debug log
    });

    setQuestions(selectedQuestionsForTest); // Tanlangan savollarni state'ga o'rnatish
    // console.log("MockTest: Randomly selected questions for this test (final state):", selectedQuestionsForTest); // Removed debug log

    setIsStudentInfoFormOpen(true);
    // console.log("handleStartTestClick: isStudentInfoFormOpen set to true."); // Removed debug log
  };

  const handleStudentInfoSave = async (id: string, name: string, phone: string) => {
    // console.log("handleStudentInfoSave: Ma'lumotlar saqlanmoqda:", { id, name, phone }); // Removed debug log
    const newStudentInfo: StudentInfo = { id, name, phone };
    setStudentInfo(newStudentInfo);

    const recordingStartedSuccessfully = await startRecording(newStudentInfo);
    // console.log("handleStudentInfoSave: Yozib olish muvaffaqiyatli boshlandimi:", recordingStartedSuccessfully); // Removed debug log

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
    // Also reload all available questions to ensure the next test starts with the latest pool
    loadAllQuestions();
  };

  return {
    isTestStarted,
    currentPartIndex,
    currentQuestionIndex,
    currentSubQuestionIndex,
    currentPhase,
    countdown,
    initialCountdown, // Return new state
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
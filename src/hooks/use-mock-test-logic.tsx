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
  CEFRSectionType,
  FullCEFRTest,
  FetchedCEFRSection,
  FetchedCEFRQuestion,
} from "@/lib/types";
import { allSpeakingParts } from "@/lib/constants";
import { getSupabaseQuestions, updateQuestionCooldown, getCefrTestDetails } from "@/lib/local-db";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/context/AuthProvider";

const TIMINGS = {
  PRE_TEST_COUNTDOWN: 5,
  // Speaking timings
  PART1_READ_QUESTION: 5,
  PART1_1_ANSWER: 30,
  PART1_2_ANSWER: 30,
  PART2_PREP: 60,
  PART2_SPEAK: 120,
  PART3_PREP: 60,
  PART3_SPEAK: 120,
  // General timings
  ANNOUNCEMENT_DELAY: 5,
  ANNOUNCEMENT_SPEAK_DURATION: 2,
  // New CEFR section timings
  LISTENING_INSTRUCTION: 5,
  LISTENING_QUESTION_DURATION: 30, // Placeholder, actual audio duration will be used
  READING_INSTRUCTION: 5,
  READING_PASSAGE_READ_TIME: 120, // 2 minutes to read passage
  READING_QUESTION_ANSWER_TIME: 60, // 1 minute to answer question
  WRITING_INSTRUCTION: 5,
  WRITING_TASK_TIME: 1200, // 20 minutes for writing task
};

export type TestPhase =
  | "idle"
  | "pre_test_countdown"
  | "section_announcement"
  | "listening_instruction"
  | "listening_audio"
  | "listening_answer"
  | "reading_instruction"
  | "reading_passage"
  | "reading_question"
  | "writing_instruction"
  | "writing_task"
  | "speaking_instruction"
  | "speaking_reading_question" // For Part 1.1/1.2 reading sub-question
  | "speaking_preparation" // For Part 2/3 preparation
  | "speaking_answer" // For all speaking parts
  | "part_finished_announcement"
  | "next_part_announcement"
  | "finished";

interface UseMockTestLogicProps {
  startRecording: (studentInfo: StudentInfo) => Promise<boolean>;
  stopAllStreams: () => void;
  cefrTestId?: string;
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
  cefrTestId,
}: UseMockTestLogicProps) => {
  const [isTestStarted, setIsTestStarted] = useState<boolean>(false);
  const [fullCefrTest, setFullCefrTest] = useState<FullCEFRTest | null>(null);
  const [testSections, setTestSections] = useState<FetchedCEFRSection[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentSubQuestionIndex, setCurrentSubQuestionIndex] = useState<number>(0); // For speaking part 1.1/1.2 sub-questions
  const [currentPhase, setCurrentPhase] = useState<TestPhase>("idle");
  const [countdown, setCountdown] = useState<number>(0);
  const [initialCountdown, setInitialCountdown] = useState<number>(0);
  const [isStudentInfoFormOpen, setIsStudentInfoFormOpen] = useState<boolean>(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  const countdownIntervalRef = useRef<number | null>(null);
  const activeCountdownPhaseRef = useRef<TestPhase | null>(null);
  const { t } = useTranslation();
  const { user } = useAuth();

  const getCurrentSection = useCallback((): FetchedCEFRSection | undefined => {
    return testSections[currentSectionIndex];
  }, [testSections, currentSectionIndex]);

  const getCurrentQuestion = useCallback((): FetchedCEFRQuestion | undefined => {
    const section = getCurrentSection();
    return section?.cefr_questions[currentQuestionIndex];
  }, [getCurrentSection, currentQuestionIndex]);

  const startCountdown = useCallback((duration: number, nextAction: () => void) => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setInitialCountdown(duration);
    setCountdown(duration);
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          activeCountdownPhaseRef.current = null;
          nextAction();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const advanceTest = useCallback(() => {
    const currentSection = getCurrentSection();
    const currentQuestion = getCurrentQuestion();

    if (!currentSection) {
      // No more sections, test finished
      stopAllStreams();
      setIsTestStarted(false);
      setCurrentPhase("finished");
      showSuccess(t("add_question_page.success_mock_test_finished"));
      return;
    }

    switch (currentSection.type) {
      case "Listening":
        if (currentPhase === "listening_instruction") {
          setCurrentPhase("listening_audio");
          // Start audio playback here, and set countdown based on audio duration
          // For now, use a placeholder duration
          // TODO: Implement actual audio playback and duration
        } else if (currentPhase === "listening_audio") {
          setCurrentPhase("listening_answer");
          // Set countdown for answering
        } else if (currentPhase === "listening_answer") {
          if (currentQuestionIndex < currentSection.cefr_questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentPhase("listening_audio"); // Next question audio
          } else {
            setCurrentPhase("part_finished_announcement"); // End of Listening section
          }
        } else {
          setCurrentPhase("listening_instruction");
        }
        break;

      case "Reading":
        if (currentPhase === "reading_instruction") {
          setCurrentPhase("reading_passage");
        } else if (currentPhase === "reading_passage") {
          setCurrentPhase("reading_question");
        } else if (currentPhase === "reading_question") {
          if (currentQuestionIndex < currentSection.cefr_questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentPhase("reading_question"); // Next question for the same passage
          } else {
            setCurrentPhase("part_finished_announcement"); // End of Reading section
          }
        } else {
          setCurrentPhase("reading_instruction");
        }
        break;

      case "Writing":
        if (currentPhase === "writing_instruction") {
          setCurrentPhase("writing_task");
        } else if (currentPhase === "writing_task") {
          if (currentQuestionIndex < currentSection.cefr_questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentPhase("writing_task"); // Next writing task
          } else {
            setCurrentPhase("part_finished_announcement"); // End of Writing section
          }
        } else {
          setCurrentPhase("writing_instruction");
        }
        break;

      case "Speaking":
        if (!currentQuestion) {
          setCurrentPhase("part_finished_announcement");
          return;
        }

        switch (currentQuestion.question_type) {
          case "system_generated_part1_1":
          case "system_generated_part1_2": {
            const subQCount = (currentQuestion as Part1_1Question | Part1_2Question).sub_questions?.length || 0;
            if (currentPhase === "speaking_instruction") {
              setCurrentPhase("speaking_reading_question");
            } else if (currentPhase === "speaking_reading_question") {
              setCurrentPhase("speaking_answer");
            } else if (currentPhase === "speaking_answer") {
              if (currentSubQuestionIndex < subQCount - 1) {
                setCurrentSubQuestionIndex(prev => prev + 1);
                setCurrentPhase("speaking_reading_question");
              } else {
                if (currentQuestionIndex < currentSection.cefr_questions.length - 1) {
                  setCurrentQuestionIndex(prev => prev + 1);
                  setCurrentSubQuestionIndex(0);
                  setCurrentPhase("speaking_instruction"); // Next Speaking question
                } else {
                  setCurrentPhase("part_finished_announcement"); // End of Speaking section
                }
              }
            } else {
              setCurrentPhase("speaking_instruction");
            }
            break;
          }
          case "system_generated_part2":
          case "system_generated_part3": {
            if (currentPhase === "speaking_instruction") {
              setCurrentPhase("speaking_preparation");
            } else if (currentPhase === "speaking_preparation") {
              setCurrentPhase("speaking_answer");
            } else if (currentPhase === "speaking_answer") {
              if (currentQuestionIndex < currentSection.cefr_questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setCurrentPhase("speaking_instruction"); // Next Speaking question
              } else {
                setCurrentPhase("part_finished_announcement"); // End of Speaking section
              }
            } else {
              setCurrentPhase("speaking_instruction");
            }
            break;
          }
          default:
            setCurrentPhase("part_finished_announcement");
            break;
        }
        break;

      default:
        setCurrentPhase("part_finished_announcement");
        break;
    }
  }, [currentSectionIndex, currentQuestionIndex, currentSubQuestionIndex, currentPhase, testSections, stopAllStreams, getCurrentSection, getCurrentQuestion, t]);

  const loadCefrTestDetailsData = useCallback(async () => {
    if (!cefrTestId) {
      // If no CEFR test ID, load regular speaking questions (fallback)
      const data = await getSupabaseQuestions();
      const loadedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
        "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
      };
      data.forEach((q: SpeakingQuestion) => {
        if (loadedQuestions[q.type as SpeakingPart]) {
          loadedQuestions[q.type as SpeakingPart].push(q);
        }
      });
      // For non-CEFR tests, we'll simulate a single "Speaking" section
      setTestSections([{
        id: "mock-speaking-section",
        test_id: "mock-test",
        type: "Speaking",
        order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cefr_questions: Object.values(loadedQuestions).flat().map(q => ({
          ...q,
          question_type: q.type.replace(/\s/g, '_').toLowerCase(), // Map SpeakingPart to question_type
          section_id: "mock-speaking-section",
        }) as FetchedCEFRQuestion),
      }]);
      return;
    }

    const testDetails = await getCefrTestDetails(cefrTestId);
    if (testDetails) {
      setFullCefrTest(testDetails);
      setTestSections(testDetails.cefr_sections);
    } else {
      showError(t("cefr_start_test_page.test_not_found"));
      // Fallback to regular speaking questions or navigate away
    }
  }, [cefrTestId, t]);

  useEffect(() => {
    loadCefrTestDetailsData();
  }, [loadCefrTestDetailsData]);

  useEffect(() => {
    if (!isTestStarted || currentPhase === "idle" || currentPhase === "finished") {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setInitialCountdown(0);
      activeCountdownPhaseRef.current = null;
      return;
    }

    if (activeCountdownPhaseRef.current === currentPhase) {
      return;
    }

    let duration = 0;
    let nextAction: () => void = advanceTest;
    const currentSection = getCurrentSection();
    const currentQuestion = getCurrentQuestion();

    if (currentPhase === "pre_test_countdown") {
      duration = TIMINGS.PRE_TEST_COUNTDOWN;
      nextAction = () => {
        const firstSectionWithQuestionsIndex = testSections.findIndex(s => s.cefr_questions.length > 0);
        if (firstSectionWithQuestionsIndex !== -1) {
          setCurrentSectionIndex(firstSectionWithQuestionsIndex);
          setCurrentQuestionIndex(0);
          setCurrentSubQuestionIndex(0);
          setCurrentPhase("section_announcement");
        } else {
          stopAllStreams();
          setIsTestStarted(false);
          setCurrentPhase("finished");
          showError(t("add_question_page.error_no_questions_available_to_start"));
        }
      };
    } else if (currentPhase === "section_announcement") {
      if (currentSection) {
        speakText(currentSection.type, 'en-US');
        duration = TIMINGS.ANNOUNCEMENT_SPEAK_DURATION;
        nextAction = () => {
          switch (currentSection.type) {
            case "Listening": setCurrentPhase("listening_instruction"); break;
            case "Reading": setCurrentPhase("reading_instruction"); break;
            case "Writing": setCurrentPhase("writing_instruction"); break;
            case "Speaking": setCurrentPhase("speaking_instruction"); break;
            default: advanceTest(); break;
          }
        };
      } else {
        advanceTest(); // No more sections
      }
    } else if (currentPhase === "part_finished_announcement") {
      if (currentSection) {
        speakText(`${currentSection.type} ${t("add_question_page.part_finished")}`, 'en-US');
        duration = TIMINGS.ANNOUNCEMENT_DELAY;
        nextAction = () => {
          setCurrentSectionIndex(prev => prev + 1);
          setCurrentQuestionIndex(0);
          setCurrentSubQuestionIndex(0);
          setCurrentPhase("section_announcement");
        };
      } else {
        advanceTest(); // Should not happen if currentSection is valid
      }
    } else if (currentQuestion) {
      switch (currentPhase) {
        // Listening
        case "listening_instruction": duration = TIMINGS.LISTENING_INSTRUCTION; break;
        case "listening_audio":
          // TODO: Get actual audio duration
          duration = TIMINGS.LISTENING_QUESTION_DURATION;
          break;
        case "listening_answer":
          duration = 15; // Time to select answer
          break;

        // Reading
        case "reading_instruction": duration = TIMINGS.READING_INSTRUCTION; break;
        case "reading_passage": duration = TIMINGS.READING_PASSAGE_READ_TIME; break;
        case "reading_question": duration = TIMINGS.READING_QUESTION_ANSWER_TIME; break;

        // Writing
        case "writing_instruction": duration = TIMINGS.WRITING_INSTRUCTION; break;
        case "writing_task": duration = TIMINGS.WRITING_TASK_TIME; break;

        // Speaking
        case "speaking_instruction": duration = TIMINGS.ANNOUNCEMENT_DELAY; break; // Announce speaking part
        case "speaking_reading_question": duration = TIMINGS.PART1_READ_QUESTION; break;
        case "speaking_preparation":
          if (currentQuestion.question_type === "system_generated_part2") duration = TIMINGS.PART2_PREP;
          else if (currentQuestion.question_type === "system_generated_part3") duration = TIMINGS.PART3_PREP;
          break;
        case "speaking_answer":
          if (currentQuestion.question_type === "system_generated_part1_1") duration = TIMINGS.PART1_1_ANSWER;
          else if (currentQuestion.question_type === "system_generated_part1_2") duration = TIMINGS.PART1_2_ANSWER;
          else if (currentQuestion.question_type === "system_generated_part2") duration = TIMINGS.PART2_SPEAK;
          else if (currentQuestion.question_type === "system_generated_part3") duration = TIMINGS.PART3_SPEAK;
          break;
        default:
          duration = 0;
          break;
      }
    } else {
      advanceTest(); // No more questions in current section
      return;
    }

    if (duration > 0) {
      activeCountdownPhaseRef.current = currentPhase;
      startCountdown(duration, nextAction);
    } else {
      nextAction();
      activeCountdownPhaseRef.current = null;
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isTestStarted, currentSectionIndex, currentQuestionIndex, currentSubQuestionIndex, currentPhase, testSections, startCountdown, advanceTest, stopAllStreams, getCurrentSection, getCurrentQuestion, t]);

  useEffect(() => {
    if (!isTestStarted) return;

    const currentSection = getCurrentSection();
    const currentQuestion = getCurrentQuestion();

    if (!currentSection || !currentQuestion) return;

    // Text-to-speech announcements
    if (currentPhase === "listening_instruction") {
      speakText(t("cefr_test_page.listening_instruction_text"), 'en-US');
    } else if (currentPhase === "reading_instruction") {
      speakText(t("cefr_test_page.reading_instruction_text"), 'en-US');
    } else if (currentPhase === "writing_instruction") {
      speakText(t("cefr_test_page.writing_instruction_text"), 'en-US');
    } else if (currentPhase === "speaking_instruction") {
      speakText(t("cefr_test_page.speaking_instruction_text"), 'en-US');
    } else if (currentPhase === "speaking_reading_question" && (currentQuestion.question_type === "system_generated_part1_1" || currentQuestion.question_type === "system_generated_part1_2")) {
      const textToSpeak = (currentQuestion as Part1_1Question | Part1_2Question).sub_questions?.[currentSubQuestionIndex];
      if (textToSpeak) speakText(textToSpeak, 'en-US');
    } else if (currentPhase === "speaking_preparation" && (currentQuestion.question_type === "system_generated_part2" || currentQuestion.question_type === "system_generated_part3")) {
      if (currentQuestion.question_text) speakText(currentQuestion.question_text, 'en-US');
    } else if (currentPhase === "speaking_answer" && currentQuestion.question_type === "system_generated_part2") {
      speakText(t("add_question_page.speak_text"), 'en-US');
    }
  }, [isTestStarted, currentPhase, currentSectionIndex, currentQuestionIndex, currentSubQuestionIndex, getCurrentSection, getCurrentQuestion, t]);

  const handleStartTestClick = async () => {
    if (!fullCefrTest && cefrTestId) {
      showError(t("cefr_start_test_page.error_loading_test_details"));
      return;
    }

    const isGuestMode = localStorage.getItem("isGuestMode") === "true";
    const questionsToUpdate: FetchedCEFRQuestion[] = [];

    // Filter questions based on cooldown for non-CEFR tests or specific CEFR questions if needed
    // For CEFR tests, we assume all questions in the selected test are "eligible" for that session.
    // Cooldown logic might be applied differently for CEFR tests (e.g., per test, not per question).
    // For now, we'll skip cooldown for CEFR test questions.

    // If it's a regular mock test (no cefrTestId), apply old logic
    if (!cefrTestId) {
      const allRegularQuestions = await getSupabaseQuestions();
      const loadedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
        "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
      };
      allRegularQuestions.forEach((q: SpeakingQuestion) => {
        if (loadedQuestions[q.type as SpeakingPart]) {
          loadedQuestions[q.type as SpeakingPart].push(q);
        }
      });

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
        let eligibleQuestions = loadedQuestions[part].filter(q =>
          !q.last_used || (now.getTime() - new Date(q.last_used!).getTime() > twoHoursInMs)
        );

        if (part === "Part 1.1") {
          const allPart1_1SubQuestions: { questionId: string; subQuestion: string; originalQuestion: Part1_1Question }[] = [];
          eligibleQuestions.forEach(q => {
            const part1_1Q = q as Part1_1Question;
            if (part1_1Q.sub_questions && part1_1Q.sub_questions.length > 0) {
              part1_1Q.sub_questions.forEach(subQ => {
                allPart1_1SubQuestions.push({ questionId: part1_1Q.id, subQuestion: subQ, originalQuestion: part1_1Q });
              });
            }
          });

          if (allPart1_1SubQuestions.length < minQuestions[part]) {
            hasEnoughQuestions = false;
            missingParts.push(`${part} (kerak: ${minQuestions[part]}, mavjud: ${allPart1_1SubQuestions.length})`);
          } else {
            const selectedSubQuestions = getRandomElements(allPart1_1SubQuestions, minQuestions[part]);
            const finalPart1_1Questions: Part1_1Question[] = selectedSubQuestions.map(item => ({
              ...item.originalQuestion,
              id: item.questionId,
              sub_questions: [item.subQuestion],
            }));
            selectedQuestionsForTest[part] = finalPart1_1Questions;
          }
        } else if (eligibleQuestions.length < minQuestions[part]) {
          hasEnoughQuestions = false;
          missingParts.push(`${part} (kerak: ${minQuestions[part]}, mavjud: ${eligibleQuestions.length})`);
        } else {
          selectedQuestionsForTest[part] = getRandomElements(eligibleQuestions, minQuestions[part]);
        }
      });

      if (!hasEnoughQuestions) {
        showError(t("add_question_page.error_not_enough_questions", { missingParts: missingParts.join(", ") }));
        return;
      }

      // Mehmon rejimi uchun rasmlarni almashtirish
      if (isGuestMode) {
        const placeholderImageUrl = "https://media.istockphoto.com/id/517188688/photo/mountain-landscape.jpg?s=1024x1024&w=0&k=20&c=z8_rWaI8x4zApNEEG9DnWlGXyDIXe-OmsAyQ5fGPVV8=";
        for (const part of allSpeakingParts) {
          selectedQuestionsForTest[part] = selectedQuestionsForTest[part].map(q => {
            if (q.type === "Part 1.2" || q.type === "Part 2" || q.type === "Part 3") {
              return { ...q, image_urls: [placeholderImageUrl] };
            }
            return q;
          });
        }
      }

      // Update cooldowns for regular questions
      const regularQuestionsToUpdate = Object.values(selectedQuestionsForTest).flat();
      for (const q of regularQuestionsToUpdate) {
        if (user?.id && q.user_id === user.id) {
          await updateQuestionCooldown(q.id);
        }
      }

      // Set test sections for regular mock test (simulated single speaking section)
      setTestSections([{
        id: "mock-speaking-section",
        test_id: "mock-test",
        type: "Speaking",
        order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cefr_questions: Object.values(selectedQuestionsForTest).flat().map(q => ({
          ...q,
          question_type: q.type.replace(/\s/g, '_').toLowerCase(),
          section_id: "mock-speaking-section",
        }) as FetchedCEFRQuestion),
      }]);

    } else {
      // CEFR Test: Use questions directly from fullCefrTest
      if (!fullCefrTest) {
        showError(t("cefr_start_test_page.error_loading_test_details"));
        return;
      }
      // For CEFR tests, we use all questions in the fetched sections.
      // No random selection or cooldown logic applied here for simplicity,
      // assuming the test structure is predefined.
      setTestSections(fullCefrTest.cefr_sections);
      // No cooldown update for CEFR test questions for now.
    }

    setIsStudentInfoFormOpen(true);
  };

  const handleStudentInfoSave = async (id: string, name: string, phone: string) => {
    const newStudentInfo: StudentInfo = { id, name, phone };
    setStudentInfo(newStudentInfo);
    const recordingStarted = await startRecording(newStudentInfo);
    if (recordingStarted) {
      setIsTestStarted(true);
      setCurrentPhase("pre_test_countdown");
      showSuccess(t("add_question_page.success_test_starting"));
      setIsStudentInfoFormOpen(false);
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.error("To'liq ekran rejimiga o'tishda xatolik:", err);
        showError(t("add_question_page.error_fullscreen_failed"));
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
    activeCountdownPhaseRef.current = null;
    showSuccess(t("add_question_page.success_mock_test_ended"));
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const handleResetTest = () => {
    setIsTestStarted(false);
    setCurrentPhase("idle");
    setStudentInfo(null);
    setCurrentSectionIndex(0);
    setCurrentQuestionIndex(0);
    setCurrentSubQuestionIndex(0);
    setFullCefrTest(null);
    setTestSections([]);
    loadCefrTestDetailsData(); // Reload initial questions/test details
    activeCountdownPhaseRef.current = null;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  return {
    isTestStarted,
    currentSectionIndex,
    currentQuestionIndex,
    currentSubQuestionIndex,
    currentPhase,
    countdown,
    initialCountdown,
    studentInfo,
    isStudentInfoFormOpen,
    setIsStudentInfoFormOpen,
    handleStartTestClick,
    handleStudentInfoSave,
    handleEndTest,
    handleResetTest,
    getCurrentSection,
    getCurrentQuestion,
    testSections,
    allSpeakingParts, // Still needed for general speaking part names
  };
};
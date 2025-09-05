"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { useRecorder } from "@/hooks/use-recorder";
import { Video } from "lucide-react";
import {
  SpeakingQuestion,
  SpeakingPart,
  StudentInfo,
  Part1Question,
  Part1_1Question,
  Part2Question,
  Part3Question,
} from "@/lib/types";
import { allSpeakingParts, getSpeakingQuestionStorageKey } from "@/lib/constants";
import StudentInfoForm from "@/components/StudentInfoForm";

// Define timings for each phase/part
const TIMINGS = {
  PART1_QUESTION: 30, // seconds
  PART1_1_QUESTION: 30, // seconds
  PART2_PREP: 60, // seconds
  PART2_SPEAK: 120, // seconds
  PART3_PREP: 60, // seconds
  PART3_SPEAK: 120, // seconds
};

type TestPhase = "idle" | "preparation" | "speaking" | "question_display" | "finished";

const MockTest: React.FC = () => {
  const [isTestStarted, setIsTestStarted] = useState<boolean>(false);
  const [questions, setQuestions] = useState<Record<SpeakingPart, SpeakingQuestion[]>>({
    "Part 1": [],
    "Part 1.1": [],
    "Part 2": [],
    "Part 3": [],
  });
  const [currentPartIndex, setCurrentPartIndex] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentSubQuestionIndex, setCurrentSubQuestionIndex] = useState<number>(0); // For Part 1.1 sub-questions
  const [currentPhase, setCurrentPhase] = useState<TestPhase>("idle");
  const [countdown, setCountdown] = useState<number>(0);
  const [isStudentInfoFormOpen, setIsStudentInfoFormOpen] = useState<boolean>(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  const { isRecording, startRecording, stopAllStreams, webcamStream, resetRecordedData } = useRecorder();
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  // Helper to get current question based on part and index
  const getCurrentQuestion = useCallback(() => {
    const currentPartName = allSpeakingParts[currentPartIndex];
    return questions[currentPartName]?.[currentQuestionIndex];
  }, [currentPartIndex, currentQuestionIndex, questions]);

  // Function to manage countdown and phase transitions
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

  const advanceTest = useCallback(() => {
    const currentPartName = allSpeakingParts[currentPartIndex];
    const currentQ = getCurrentQuestion();

    if (!currentQ) {
      // No more questions in current part, try next part
      if (currentPartIndex < allSpeakingParts.length - 1) {
        setCurrentPartIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
        setCurrentSubQuestionIndex(0);
        setCurrentPhase("question_display"); // Start next part by displaying its first question
      } else {
        // All parts finished
        stopAllStreams();
        setIsTestStarted(false);
        setCurrentPhase("finished");
        showSuccess("Mock test completed!");
      }
      return;
    }

    // Logic for advancing within a part based on question type and phase
    switch (currentQ.type) {
      case "part1": {
        // Part 1: 30s per question, then next question or next part
        if (currentQuestionIndex < questions[currentPartName].length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          startCountdown(TIMINGS.PART1_QUESTION, advanceTest);
          setCurrentPhase("question_display");
        } else {
          // No more questions in Part 1, move to next part
          advanceTest(); // Call itself to move to the next part
        }
        break;
      }
      case "part1.1": {
        // Part 1.1: 2 images, 3 sub-questions each, 30s per sub-question
        const part1_1Q = currentQ as Part1_1Question;
        if (currentSubQuestionIndex < part1_1Q.subQuestions.length - 1) {
          setCurrentSubQuestionIndex(prev => prev + 1);
          startCountdown(TIMINGS.PART1_1_QUESTION, advanceTest);
          setCurrentPhase("question_display");
        } else {
          // All sub-questions for current image finished, move to next image or next part
          if (currentQuestionIndex < questions[currentPartName].length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentSubQuestionIndex(0); // Reset sub-question index for new image
            startCountdown(TIMINGS.PART1_1_QUESTION, advanceTest);
            setCurrentPhase("question_display");
          } else {
            // All images and sub-questions for Part 1.1 finished, move to next part
            advanceTest(); // Call itself to move to the next part
          }
        }
        break;
      }
      case "part2": {
        // Part 2: 60s prep, 120s speak
        if (currentPhase === "question_display") {
          setCurrentPhase("preparation");
          startCountdown(TIMINGS.PART2_PREP, advanceTest); // After prep, move to speaking
        } else if (currentPhase === "preparation") {
          setCurrentPhase("speaking");
          startCountdown(TIMINGS.PART2_SPEAK, advanceTest); // After speaking, move to next part
        } else if (currentPhase === "speaking") {
          advanceTest(); // Move to next part
        }
        break;
      }
      case "part3": {
        // Part 3: 60s prep, 120s speak, then test finishes
        if (currentPhase === "question_display") {
          setCurrentPhase("preparation");
          startCountdown(TIMINGS.PART3_PREP, advanceTest); // After prep, move to speaking
        } else if (currentPhase === "preparation") {
          setCurrentPhase("speaking");
          startCountdown(TIMINGS.PART3_SPEAK, advanceTest); // After speaking, test finishes
        } else if (currentPhase === "speaking") {
          advanceTest(); // Test finishes
        }
        break;
      }
      default:
        // This default case should ideally not be reached if all SpeakingQuestion types are handled.
        // Casting to 'any' to allow access to 'type' for logging purposes.
        console.warn("Unknown question type encountered:", (currentQ as any).type); 
        advanceTest(); // Try to move to next anyway
    }
  }, [currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, questions, currentPhase, startCountdown, stopAllStreams, getCurrentQuestion]);


  // Load questions on component mount
  useEffect(() => {
    const loadedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
      "Part 1": [], "Part 1.1": [], "Part 2": [], "Part 3": [],
    };
    allSpeakingParts.forEach(part => {
      const storageKey = getSpeakingQuestionStorageKey(part);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        loadedQuestions[part] = JSON.parse(stored);
      }
    });
    setQuestions(loadedQuestions);
  }, []);

  // Manage webcam video stream for display
  useEffect(() => {
    if (webcamVideoRef.current) {
      if (webcamStream) {
        webcamVideoRef.current.srcObject = webcamStream;
      } else {
        webcamVideoRef.current.srcObject = null;
      }
    }
  }, [webcamStream]);

  // Effect to start the test flow when isTestStarted becomes true
  useEffect(() => {
    if (isTestStarted && currentPhase === "idle") {
      // Initial check for questions
      const totalQuestions = allSpeakingParts.reduce((sum, part) => sum + questions[part].length, 0);
      if (totalQuestions === 0) {
        showError("Mock testni boshlash uchun savollar mavjud emas. Iltimos, avval savollar qo'shing.");
        setIsTestStarted(false);
        setStudentInfo(null);
        return;
      }

      // Find the first part with questions
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
      setCurrentPhase("question_display"); // Start by displaying the first question
      const firstQuestion = questions[allSpeakingParts[firstPartWithQuestionsIndex]]?.[0];
      if (firstQuestion) {
        let initialDuration = 0;
        switch (firstQuestion.type) {
          case "part1":
            initialDuration = TIMINGS.PART1_QUESTION;
            break;
          case "part1.1":
            initialDuration = TIMINGS.PART1_1_QUESTION;
            break;
          case "part2":
            initialDuration = TIMINGS.PART2_PREP; // Part 2 starts with preparation
            setCurrentPhase("preparation");
            break;
          case "part3":
            initialDuration = TIMINGS.PART3_PREP; // Part 3 starts with preparation
            setCurrentPhase("preparation");
            break;
        }
        if (initialDuration > 0) {
          startCountdown(initialDuration, advanceTest);
        } else {
          // If no specific duration, immediately advance to handle complex flows like Part 2/3 prep
          advanceTest();
        }
      } else {
        // Should not happen if firstPartWithQuestionsIndex is valid, but as a fallback
        showError("Savollar yuklanmadi. Iltimos, qayta urinib ko'ring.");
        setIsTestStarted(false);
        setStudentInfo(null);
      }
    }
  }, [isTestStarted, currentPhase, questions, startCountdown, advanceTest]);


  const handleStartTestClick = () => {
    const totalQuestions = allSpeakingParts.reduce((sum, part) => sum + questions[part].length, 0);
    if (totalQuestions === 0) {
      showError("Mock testni boshlash uchun savollar mavjud emas. Iltimos, avval savollar qo'shing.");
      return;
    }
    setIsStudentInfoFormOpen(true); // Open student info form
  };

  const handleStudentInfoSave = async (id: string, name: string, phone: string) => {
    const newStudentInfo: StudentInfo = { id, name, phone };
    setStudentInfo(newStudentInfo);

    const recordingStartedSuccessfully = await startRecording(newStudentInfo);
    if (!recordingStartedSuccessfully) {
      setStudentInfo(null); // Clear student info if recording failed
      setIsStudentInfoFormOpen(false); // Close form if recording failed
      return;
    }

    setIsTestStarted(true);
    setCurrentPhase("idle"); // Set to idle, useEffect will pick it up to start the test flow
    showSuccess("Mock test boshlandi!");
  };

  const handleEndTest = () => {
    stopAllStreams();
    setIsTestStarted(false);
    setCurrentPhase("finished");
    setStudentInfo(null); // Clear student info on test end
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    showSuccess("Mock test tugatildi.");
  };

  const currentPartName = allSpeakingParts[currentPartIndex];
  const currentQ = getCurrentQuestion();

  const renderCurrentQuestion = () => {
    if (!currentQ) {
      return (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">Ushbu bo'limda yoki keyingi bo'limlarda savollar tugadi.</h3>
          <p className="text-muted-foreground">Iltimos, mashq qilishni davom ettirish uchun ko'proq savollar qo'shing.</p>
        </div>
      );
    }

    switch (currentQ.type) {
      case "part1":
        const part1Q = currentQ as Part1Question;
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-muted-foreground">
              {currentPartName} - Savol {currentQuestionIndex + 1}
            </h3>
            <p className="text-5xl font-bold text-primary mb-4">{countdown}</p>
            <p className="text-2xl font-medium text-foreground min-h-[100px] flex items-center justify-center p-4 border rounded-md bg-secondary">
              {part1Q.text}
            </p>
          </div>
        );
      case "part1.1":
        const part1_1Q = currentQ as Part1_1Question;
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-muted-foreground">
              {currentPartName} - Rasm {currentQuestionIndex + 1}
            </h3>
            <img src={part1_1Q.imageUrl} alt="Question image" className="max-h-64 object-contain mx-auto mb-4 rounded-lg shadow-md" />
            <p className="text-5xl font-bold text-primary mb-4">{countdown}</p>
            <div className="min-h-[100px] flex flex-col items-center justify-center p-4 border rounded-md bg-secondary text-foreground">
              <p className="text-xl font-medium mb-2">Savol {currentSubQuestionIndex + 1}:</p>
              <p className="text-2xl font-medium text-center">{part1_1Q.subQuestions[currentSubQuestionIndex]}</p>
            </div>
          </div>
        );
      case "part2":
        const part2Q = currentQ as Part2Question;
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-muted-foreground">
              {currentPartName} - Savol {currentQuestionIndex + 1}
            </h3>
            <img src={part2Q.imageUrl} alt="Question image" className="max-h-64 object-contain mx-auto mb-4 rounded-lg shadow-md" />
            <p className="text-5xl font-bold text-primary mb-4">
              {currentPhase === "preparation" ? `Tayyorgarlik: ${countdown}` : `Javob: ${countdown}`}
            </p>
            <p className="text-2xl font-medium text-foreground min-h-[100px] flex items-center justify-center p-4 border rounded-md bg-secondary">
              {part2Q.question}
            </p>
          </div>
        );
      case "part3":
        const part3Q = currentQ as Part3Question;
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-muted-foreground">
              {currentPartName} - Savol {currentQuestionIndex + 1}
            </h3>
            <p className="text-5xl font-bold text-primary mb-4">
              {currentPhase === "preparation" ? `Tayyorgarlik: ${countdown}` : `Javob: ${countdown}`}
            </p>
            <p className="text-2xl font-medium text-foreground min-h-[100px] flex items-center justify-center p-4 border rounded-md bg-secondary mb-4">
              {part3Q.question}
            </p>
            <img src={part3Q.imageUrl} alt="Question image" className="max-h-64 object-contain mx-auto rounded-lg shadow-md" />
          </div>
        );
      default:
        return <p className="text-muted-foreground">Noma'lum savol turi.</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl text-center relative">
          {/* Webcam Preview (always visible if stream is available) */}
          {webcamStream && (
            <video
              ref={webcamVideoRef}
              autoPlay
              muted
              className="absolute top-4 right-4 w-32 h-24 rounded-lg shadow-lg border-2 border-primary-foreground bg-black z-10"
            />
          )}

          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 text-red-500 font-semibold z-10">
              <Video className="h-5 w-5 animate-pulse" /> REC
            </div>
          )}

          {isTestStarted && studentInfo && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white p-2 rounded-md text-sm z-10">
              <p><strong>ID:</strong> {studentInfo.id}</p>
              <p><strong>Ism:</strong> {studentInfo.name}</p>
              <p><strong>Tel:</strong> {studentInfo.phone}</p>
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Mock Speaking Test</CardTitle>
            <CardDescription>Practice your speaking skills with generated questions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isTestStarted && currentPhase === "idle" && (
              <Button onClick={handleStartTestClick} size="lg" className="text-lg px-8 py-4">
                Testni boshlash (yozib olish bilan)
              </Button>
            )}

            {isTestStarted && currentPhase !== "finished" && renderCurrentQuestion()}

            {isTestStarted && currentPhase !== "finished" && (
              <div className="flex gap-2 mt-4">
                <Button onClick={advanceTest} className="flex-grow" disabled={true}>
                  Keyingi savol (Avtomatik)
                </Button>
                <Button onClick={handleEndTest} variant="destructive" className="flex-grow">
                  Testni tugatish
                </Button>
              </div>
            )}

            {currentPhase === "finished" && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">Test yakunlandi! 🎉</h3>
                <p className="text-muted-foreground">Siz barcha mavjud savollarni ko'rib chiqdingiz.</p>
                <Button onClick={() => {
                  setIsTestStarted(false);
                  setCurrentPhase("idle");
                  resetRecordedData();
                  setStudentInfo(null);
                }} variant="outline" className="w-full">
                  Testni qayta boshlash
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Oxirgi yozib olingan sessiyangiz "Records" bo'limida mavjud.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
      <StudentInfoForm
        isOpen={isStudentInfoFormOpen}
        onClose={() => setIsStudentInfoFormOpen(false)}
        onSave={handleStudentInfoSave}
      />
    </div>
  );
};

export default MockTest;
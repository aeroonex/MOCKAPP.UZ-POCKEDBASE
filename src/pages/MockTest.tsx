"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { useRecorder } from "@/hooks/use-recorder";
import { Video } from "lucide-react";
import { SpeakingQuestion, SpeakingPart, StudentInfo } from "@/lib/types"; // Import StudentInfo
import { allSpeakingParts, getSpeakingQuestionStorageKey } from "@/lib/constants";
import StudentInfoForm from "@/components/StudentInfoForm"; // Import the new component

const MOCK_TEST_QUESTION_DURATION = 30; // seconds

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
  const [isTestFinished, setIsTestFinished] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(MOCK_TEST_QUESTION_DURATION);
  const [isStudentInfoFormOpen, setIsStudentInfoFormOpen] = useState<boolean>(false); // State for dialog
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null); // State to store student info

  const { isRecording, startRecording, stopAllStreams, webcamStream, resetRecordedData } = useRecorder();
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  // Function to move to the next question or part
  const nextQuestion = useCallback(() => {
    const currentPart = allSpeakingParts[currentPartIndex];
    const partQuestions = questions[currentPart];

    if (currentQuestionIndex < partQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCountdown(MOCK_TEST_QUESTION_DURATION); // Reset countdown for new question
    } else {
      if (currentPartIndex < allSpeakingParts.length - 1) {
        setCurrentPartIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
        setCountdown(MOCK_TEST_QUESTION_DURATION); // Reset countdown for new part
      } else {
        // No more questions or parts
        stopAllStreams();
        setIsTestFinished(true);
        setIsTestStarted(false);
        showSuccess("Mock test completed!");
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    }
  }, [currentPartIndex, currentQuestionIndex, questions, stopAllStreams]);

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

  // Manage countdown timer
  useEffect(() => {
    if (isTestStarted && !isTestFinished) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      countdownIntervalRef.current = window.setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            countdownIntervalRef.current = null;
            nextQuestion(); // Automatically move to next question
            return MOCK_TEST_QUESTION_DURATION; // Reset for next question immediately
          }
          return prev - 1;
        });
      }, 1000);
    } else if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isTestStarted, isTestFinished, nextQuestion, currentPartIndex, currentQuestionIndex]); // Re-run effect when question/part changes

  const handleStartTestClick = () => {
    const totalQuestions = allSpeakingParts.reduce((sum, part) => sum + questions[part].length, 0);
    if (totalQuestions === 0) {
      showError("No questions available to start the mock test. Please add some questions first.");
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
    setIsTestFinished(false);
    setCurrentPartIndex(0);
    setCurrentQuestionIndex(0);
    setCountdown(MOCK_TEST_QUESTION_DURATION); // Initialize countdown
    showSuccess("Mock test started!");
  };

  const handleEndTest = () => {
    stopAllStreams();
    setIsTestFinished(true);
    setIsTestStarted(false);
    setStudentInfo(null); // Clear student info on test end
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    showSuccess("Mock test ended.");
  };

  const currentPart = allSpeakingParts[currentPartIndex];
  const currentQuestion = questions[currentPart]?.[currentQuestionIndex];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl text-center relative">
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 text-red-500 font-semibold z-10">
              <Video className="h-5 w-5 animate-pulse" /> REC
            </div>
          )}
          {webcamStream && (
            <video
              ref={webcamVideoRef}
              autoPlay
              muted
              className="absolute top-4 right-4 w-32 h-24 rounded-lg shadow-lg border-2 border-primary-foreground bg-black z-10"
            />
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
            {!isTestStarted && !isTestFinished && (
              <Button onClick={handleStartTestClick} size="lg" className="text-lg px-8 py-4">
                Start Test (with Recording)
              </Button>
            )}

            {isTestStarted && currentQuestion && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-muted-foreground">
                  {currentPart} - Question {currentQuestionIndex + 1}
                </h3>
                <p className="text-5xl font-bold text-primary mb-4">{countdown}</p> {/* Countdown display */}
                <p className="text-2xl font-medium text-foreground min-h-[100px] flex items-center justify-center p-4 border rounded-md bg-secondary">
                  {currentQuestion.text}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button onClick={nextQuestion} className="flex-grow" disabled={true}> {/* Disable Next Question button */}
                    Next Question (Auto)
                  </Button>
                  <Button onClick={handleEndTest} variant="destructive" className="flex-grow">
                    End Test
                  </Button>
                </div>
              </div>
            )}

            {isTestFinished && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">Test Completed! 🎉</h3>
                <p className="text-muted-foreground">You have gone through all available questions.</p>
                <Button onClick={() => { setIsTestFinished(false); resetRecordedData(); setStudentInfo(null); }} variant="outline" className="w-full">
                  Restart Test
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Your last recording is available in the "Records" section.
                </p>
              </div>
            )}

            {isTestStarted && !currentQuestion && !isTestFinished && (
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">No more questions in this part or subsequent parts.</h3>
                    <p className="text-muted-foreground">Please add more questions to continue practicing.</p>
                    <Button onClick={handleEndTest} variant="outline" className="w-full">
                        End Test
                    </Button>
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
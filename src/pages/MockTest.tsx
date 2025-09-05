"use client";

import React, { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { useRecorder } from "@/hooks/use-recorder";
import { Video } from "lucide-react";
import { SpeakingQuestion, SpeakingPart } from "@/lib/types";
import { allSpeakingParts, getSpeakingQuestionStorageKey } from "@/lib/constants";

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

  const { isRecording, startRecording, stopAllStreams, webcamStream, resetRecordedData } = useRecorder(); // Use stopAllStreams
  const webcamVideoRef = useRef<HTMLVideoElement>(null);

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

  useEffect(() => {
    if (webcamVideoRef.current) {
      if (webcamStream) {
        webcamVideoRef.current.srcObject = webcamStream;
      } else {
        webcamVideoRef.current.srcObject = null;
      }
    }
  }, [webcamStream]);

  const startTest = async () => {
    const totalQuestions = allSpeakingParts.reduce((sum, part) => sum + questions[part].length, 0);
    if (totalQuestions === 0) {
      showError("No questions available to start the mock test. Please add some questions first.");
      return;
    }

    await startRecording();
    // Check if recording actually started successfully (webcamStream should be available)
    if (!webcamStream) {
        showError("Failed to start webcam for recording. Please ensure camera permissions are granted.");
        stopAllStreams(); // Clean up any partial streams
        return;
    }

    setIsTestStarted(true);
    setIsTestFinished(false);
    setCurrentPartIndex(0);
    setCurrentQuestionIndex(0);
    showSuccess("Mock test started!");
  };

  const nextQuestion = () => {
    const currentPart = allSpeakingParts[currentPartIndex];
    const partQuestions = questions[currentPart];

    if (currentQuestionIndex < partQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      if (currentPartIndex < allSpeakingParts.length - 1) {
        setCurrentPartIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
      } else {
        stopAllStreams(); // Stop all streams when test finishes
        setIsTestFinished(true);
        setIsTestStarted(false);
        showSuccess("Mock test completed!");
      }
    }
  };

  const handleEndTest = () => {
    stopAllStreams(); // Stop all streams if user manually ends test
    setIsTestFinished(true);
    setIsTestStarted(false);
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
            <div className="absolute top-4 left-4 flex items-center gap-2 text-red-500 font-semibold">
              <Video className="h-5 w-5 animate-pulse" /> REC
            </div>
          )}
          {webcamStream && ( // Display webcam if stream is active
            <video
              ref={webcamVideoRef}
              autoPlay
              muted
              className="absolute top-4 right-4 w-32 h-24 rounded-lg shadow-lg border-2 border-primary-foreground bg-black"
            />
          )}
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Mock Speaking Test</CardTitle>
            <CardDescription>Practice your speaking skills with generated questions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isTestStarted && !isTestFinished && (
              <Button onClick={startTest} size="lg" className="text-lg px-8 py-4">
                Start Test (with Recording)
              </Button>
            )}

            {isTestStarted && currentQuestion && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-muted-foreground">
                  {currentPart} - Question {currentQuestionIndex + 1}
                </h3>
                <p className="text-2xl font-medium text-foreground min-h-[100px] flex items-center justify-center p-4 border rounded-md bg-secondary">
                  {currentQuestion.text}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button onClick={nextQuestion} className="flex-grow">
                    Next Question
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
                <Button onClick={() => { setIsTestFinished(false); resetRecordedData(); }} variant="outline" className="w-full">
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
    </div>
  );
};

export default MockTest;
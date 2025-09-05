"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";

interface SpeakingQuestion {
  id: string;
  text: string;
  date: string; // ISO string
}

type SpeakingPart = "Part 1" | "Part 1.1" | "Part 2" | "Part 3";

const allSpeakingParts: SpeakingPart[] = ["Part 1", "Part 1.1", "Part 2", "Part 3"];

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

  useEffect(() => {
    // Load questions from localStorage for each part
    const loadedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
      "Part 1": [],
      "Part 1.1": [],
      "Part 2": [],
      "Part 3": [],
    };
    allSpeakingParts.forEach(part => {
      const storageKey = `speakingQuestions_${part.replace(/\s/g, '_').replace(/\./g, '')}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        loadedQuestions[part] = JSON.parse(stored);
      }
    });
    setQuestions(loadedQuestions);
  }, []);

  const startTest = () => {
    // Check if there are any questions available
    const totalQuestions = allSpeakingParts.reduce((sum, part) => sum + questions[part].length, 0);
    if (totalQuestions === 0) {
      showError("No questions available to start the mock test. Please add some questions first.");
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
      // Move to the next question in the current part
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Move to the next part
      if (currentPartIndex < allSpeakingParts.length - 1) {
        setCurrentPartIndex(prev => prev + 1);
        setCurrentQuestionIndex(0); // Reset question index for the new part
      } else {
        // End of all parts and questions
        setIsTestFinished(true);
        setIsTestStarted(false);
        showSuccess("Mock test completed!");
      }
    }
  };

  const currentPart = allSpeakingParts[currentPartIndex];
  const currentQuestion = questions[currentPart]?.[currentQuestionIndex];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl text-center">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Mock Speaking Test</CardTitle>
            <CardDescription>Practice your speaking skills with generated questions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isTestStarted && !isTestFinished && (
              <Button onClick={startTest} size="lg" className="text-lg px-8 py-4">
                Start Test
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
                <Button onClick={nextQuestion} className="w-full">
                  Next Question
                </Button>
              </div>
            )}

            {isTestFinished && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">Test Completed! 🎉</h3>
                <p className="text-muted-foreground">You have gone through all available questions.</p>
                <Button onClick={() => setIsTestFinished(false)} variant="outline" className="w-full">
                  Restart Test
                </Button>
              </div>
            )}

            {isTestStarted && !currentQuestion && !isTestFinished && (
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">No more questions in this part or subsequent parts.</h3>
                    <p className="text-muted-foreground">Please add more questions to continue practicing.</p>
                    <Button onClick={() => setIsTestFinished(true)} variant="outline" className="w-full">
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
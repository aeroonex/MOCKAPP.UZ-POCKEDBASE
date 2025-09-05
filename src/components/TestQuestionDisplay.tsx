"use client";

import React from "react";
import {
  SpeakingQuestion,
  SpeakingPart,
  Part1_1Question,
  Part1_2Question, // Import new type
  Part2Question,
  Part3Question,
} from "@/lib/types";
import { TestPhase } from "@/hooks/use-mock-test-logic";
import { Hourglass } from "lucide-react"; // Import Hourglass icon

interface TestQuestionDisplayProps {
  currentQ: SpeakingQuestion | undefined;
  currentPartName: SpeakingPart;
  currentQuestionIndex: number;
  currentSubQuestionIndex: number;
  currentPhase: TestPhase;
  countdown: number;
}

const TestQuestionDisplay: React.FC<TestQuestionDisplayProps> = ({
  currentQ,
  currentPartName,
  currentQuestionIndex,
  currentSubQuestionIndex,
  currentPhase,
  countdown,
}) => {
  if (currentPhase === "part_finished_announcement" || currentPhase === "next_part_announcement") {
    return (
      <div className="space-y-4 flex flex-col items-center justify-center min-h-[250px]">
        <Hourglass className="h-16 w-16 text-primary animate-spin" />
        <h3 className="text-2xl font-bold text-primary dark:text-primary-foreground mt-4">
          {currentPhase === 'part_finished_announcement' ? 'Bo\'lim yakunlandi' : 'Keyingi bo\'limga tayyorlaning...'}
        </h3>
        <p className="text-7xl font-bold text-primary mb-4">{countdown}</p>
      </div>
    );
  }

  if (currentPhase === "pre_test_countdown") {
    return (
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-primary dark:text-primary-foreground">Please prepare yourself!</h3>
        <p className="text-7xl font-bold text-primary mb-4">{countdown}</p>
        <p className="text-xl text-muted-foreground">Test {countdown} soniyadan so'ng boshlanadi.</p>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">Ushbu bo'limda yoki keyingi bo'limlarda savollar tugadi.</h3>
        <p className="text-muted-foreground">Iltimos, mashq qilishni davom ettirish uchun ko'proq savollar qo'shing.</p>
      </div>
    );
  }

  switch (currentQ.type) {
    case "part1.1":
      const part1_1Q = currentQ as Part1_1Question;
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-muted-foreground">
            {currentPartName} - Savol {currentQuestionIndex + 1}
          </h3>
          <p className="text-5xl font-bold text-primary mb-4">{countdown}</p>
          <div className="min-h-[100px] flex flex-col items-center justify-center p-4 border rounded-md bg-secondary text-foreground">
            <p className="text-xl font-medium mb-2">Savol {currentSubQuestionIndex + 1}:</p>
            <p className="text-2xl font-medium text-center">{part1_1Q.subQuestions[currentSubQuestionIndex]}</p>
          </div>
        </div>
      );
    case "part1.2": // New Part 1.2 display
      const part1_2Q = currentQ as Part1_2Question;
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-muted-foreground">
            {currentPartName} - Rasm {currentQuestionIndex + 1}
          </h3>
          <div className="flex justify-center gap-4 mb-4"> {/* Display two images */}
            {part1_2Q.imageUrls.map((url, idx) => (
              <img key={idx} src={url} alt={`Question image ${idx + 1}`} className="max-h-64 object-contain rounded-lg shadow-md" />
            ))}
          </div>
          <p className="text-5xl font-bold text-primary mb-4">{countdown}</p>
          <div className="min-h-[100px] flex flex-col items-center justify-center p-4 border rounded-md bg-secondary text-foreground">
            <p className="text-xl font-medium mb-2">Savol {currentSubQuestionIndex + 1}:</p>
            <p className="text-2xl font-medium text-center">{part1_2Q.subQuestions[currentSubQuestionIndex]}</p>
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
          <div className="flex justify-center gap-4 mb-4"> {/* Display two images */}
            {part2Q.imageUrls.map((url, idx) => (
              <img key={idx} src={url} alt={`Question image ${idx + 1}`} className="max-h-64 object-contain rounded-lg shadow-md" />
            ))}
          </div>
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
          <div className="flex justify-center gap-4"> {/* Display two images */}
            {part3Q.imageUrls.map((url, idx) => (
              <img key={idx} src={url} alt={`Question image ${idx + 1}`} className="max-h-64 object-contain rounded-lg shadow-md" />
            ))}
          </div>
        </div>
      );
    default:
      return <p className="text-muted-foreground">Noma'lum savol turi.</p>;
  }
};

export default TestQuestionDisplay;
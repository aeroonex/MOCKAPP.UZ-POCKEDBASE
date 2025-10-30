"use client";

import React, { useState, useEffect } from "react";
import {
  SpeakingQuestion,
  SpeakingPart,
  Part1_1Question,
  Part1_2Question,
  Part2Question,
  Part3Question,
} from "@/lib/types";
import { TestPhase } from "@/hooks/use-mock-test-logic";
import { Hourglass } from "lucide-react";

interface TestQuestionDisplayProps {
  currentQ: SpeakingQuestion | undefined;
  currentPartName: SpeakingPart;
  currentQuestionIndex: number;
  currentSubQuestionIndex: number;
  currentPhase: TestPhase;
  countdown: number;
  initialCountdown: number; // New prop for progress calculation
}

const TestQuestionDisplay: React.FC<TestQuestionDisplayProps> = ({
  currentQ,
  currentPartName,
  currentQuestionIndex,
  currentSubQuestionIndex,
  currentPhase,
  countdown,
  initialCountdown,
}) => {
  // CountdownBar komponentini ichki holat bilan silliq animatsiya uchun
  const CountdownBar = ({ label }: { label?: string }) => {
    const [barWidth, setBarWidth] = useState(100); // Barning boshlang'ich kengligi
    const [transitionDuration, setTransitionDuration] = useState(0); // Animatsiya davomiyligi

    useEffect(() => {
      // initialCountdown o'zgarganda (yangi hisoblash boshlanganda) animatsiyani qayta boshlash
      if (initialCountdown > 0) {
        setBarWidth(100); // Kenglikni 100% ga o'rnatish
        setTransitionDuration(initialCountdown); // Animatsiya davomiyligini belgilash

        // Kichik kechikishdan so'ng kenglikni 0% ga o'rnatish, bu CSS transitionni ishga tushiradi
        const startTransitionTimer = setTimeout(() => {
          setBarWidth(0);
        }, 50); // 50ms kechikish, 100% kenglik avval render qilinishini ta'minlash uchun

        return () => clearTimeout(startTransitionTimer);
      } else {
        // Hisoblash faol bo'lmaganda holatni tiklash
        setBarWidth(0); // Tugagan holatda 0% kenglik
        setTransitionDuration(0); // Animatsiya yo'q
      }
    }, [initialCountdown]); // initialCountdown ga bog'liq, shunda har yangi hisoblashda animatsiya qayta boshlanadi

    return (
      <div className="w-full space-y-2">
        {label && <p className="text-xl font-semibold">{label}</p>}
        <div className="relative w-full h-10 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-inner">
          <div
            className="absolute top-0 left-0 h-full bg-primary" // Chap tomondan boshlanadi
            style={{
              width: `${barWidth}%`,
              transition: `width ${transitionDuration}s linear`,
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white mix-blend-difference pointer-events-none">
            {countdown}
          </span>
        </div>
      </div>
    );
  };

  if (currentPhase === "part_finished_announcement" || currentPhase === "next_part_announcement") {
    return (
      <div className="space-y-4 flex flex-col items-center justify-center min-h-[250px]">
        <Hourglass className="h-16 w-16 text-primary animate-spin" />
        <h3 className="text-2xl font-bold text-primary dark:text-primary-foreground mt-4">
          {currentPhase === 'part_finished_announcement' ? 'Bo\'lim yakunlandi' : 'Keyingi bo\'limga tayyorlaning...'}
        </h3>
        <CountdownBar />
      </div>
    );
  }

  if (currentPhase === "pre_test_countdown") {
    return (
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-primary dark:text-primary-foreground">Please prepare yourself!</h3>
        <CountdownBar />
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
    case "Part 1.1":
      const part1_1Q = currentQ as Part1_1Question;
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-muted-foreground">
            {currentPartName} - Savol {currentQuestionIndex + 1}
          </h3>
          <CountdownBar label={currentPhase === "reading_question" ? "O'qish:" : "Javob:"} />
          <div className="min-h-[100px] flex flex-col items-center justify-center p-4 border rounded-md bg-secondary text-foreground">
            <p className="text-2xl font-medium text-center">{part1_1Q.sub_questions[currentSubQuestionIndex]}</p>
          </div>
        </div>
      );
    case "Part 1.2":
      const part1_2Q = currentQ as Part1_2Question;
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-muted-foreground">
            {currentPartName} - Rasm {currentQuestionIndex + 1}
          </h3>
          <div className="flex justify-center gap-4 mb-4">
            {part1_2Q.image_urls.map((url, idx) => (
              <img key={idx} src={url} alt={`Question image ${idx + 1}`} className="max-h-64 object-contain rounded-lg shadow-md" />
            ))}
          </div>
          <CountdownBar label={currentPhase === "reading_question" ? "O'qish:" : "Javob:"} />
          <div className="min-h-[100px] flex flex-col items-center justify-center p-4 border rounded-md bg-secondary text-foreground">
            <p className="text-2xl font-medium text-center">{part1_2Q.sub_questions[currentSubQuestionIndex]}</p>
          </div>
        </div>
      );
    case "Part 2":
      const part2Q = currentQ as Part2Question;
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-muted-foreground">
            {currentPartName} - Savol {currentQuestionIndex + 1}
          </h3>
          <div className="flex justify-center gap-4 mb-4">
            {part2Q.image_urls.map((url, idx) => (
              <img key={idx} src={url} alt={`Question image ${idx + 1}`} className="max-h-64 object-contain rounded-lg shadow-md" />
            ))}
          </div>
          <CountdownBar label={currentPhase === "preparation" ? "Tayyorgarlik:" : "Javob:"} />
          <p className="text-2xl font-medium text-foreground min-h-[100px] flex items-center justify-center p-4 border rounded-md bg-secondary">
            {part2Q.question_text}
          </p>
        </div>
      );
    case "Part 3":
      const part3Q = currentQ as Part3Question;
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-muted-foreground">
            {currentPartName} - Savol {currentQuestionIndex + 1}
          </h3>
          <CountdownBar label={currentPhase === "preparation" ? "Tayyorgarlik:" : "Javob:"} />
          <p className="text-2xl font-medium text-foreground min-h-[100px] flex items-center justify-center p-4 border rounded-md bg-secondary mb-4">
            {part3Q.question_text}
          </p>
          <div className="flex justify-center gap-4">
            {part3Q.image_urls.map((url, idx) => (
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
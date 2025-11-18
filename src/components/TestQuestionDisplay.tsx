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
import { useTranslation } from 'react-i18next';

interface TestQuestionDisplayProps {
  currentQ: SpeakingQuestion | undefined;
  currentPartName: SpeakingPart;
  currentQuestionIndex: number;
  currentSubQuestionIndex: number;
  currentPhase: TestPhase;
  countdown: number;
  initialCountdown: number;
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
  const { t } = useTranslation();

  const CountdownBar = ({ label, countdown, initialCountdown }: { label?: string; countdown: number; initialCountdown: number }) => {
    const progress = initialCountdown > 0 ? (countdown / initialCountdown) * 100 : 0;

    return (
      <div className="w-full space-y-2">
        {label && <p className="text-xl font-semibold">{label}</p>}
        <div className="relative w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-inner">
          <div
            className="absolute top-0 left-0 h-full bg-primary"
            style={{
              width: `${progress}%`,
              transition: 'width 1s linear',
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white mix-blend-difference pointer-events-none">
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
          {currentPhase === 'part_finished_announcement' ? t("add_question_page.part_finished") : t("add_question_page.prepare_for_next_part")}
        </h3>
        <CountdownBar countdown={countdown} initialCountdown={initialCountdown} />
      </div>
    );
  }

  if (currentPhase === "pre_test_countdown") {
    return (
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-primary dark:text-primary-foreground">{t("add_question_page.please_prepare_yourself")}</h3>
        <CountdownBar countdown={countdown} initialCountdown={initialCountdown} />
        <p className="text-xl text-muted-foreground">{t("add_question_page.test_starts_in", { countdown })}</p>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">{t("add_question_page.no_questions_in_this_part")}</h3>
        <p className="text-muted-foreground">{t("add_question_page.add_more_questions_to_continue")}</p>
      </div>
    );
  }

  switch (currentQ.type) {
    case "Part 1.1":
      const part1_1Q = currentQ as Part1_1Question;
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-muted-foreground">
            {currentPartName} - {t("add_question_page.question")} {currentQuestionIndex + 1}
          </h3>
          <CountdownBar label={currentPhase === "reading_question" ? t("add_question_page.reading") : t("add_question_page.answer")} countdown={countdown} initialCountdown={initialCountdown} />
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
            {currentPartName} - {t("add_question_page.image")} {currentQuestionIndex + 1}
          </h3>
          <div className="flex justify-center gap-4 mb-4">
            {part1_2Q.image_urls.map((url, idx) => (
              <img key={idx} src={url} alt={`Question image ${idx + 1}`} className="max-h-64 object-contain rounded-lg shadow-md" />
            ))}
          </div>
          <CountdownBar label={currentPhase === "reading_question" ? t("add_question_page.reading") : t("add_question_page.answer")} countdown={countdown} initialCountdown={initialCountdown} />
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
            {currentPartName} - {t("add_question_page.question")} {currentQuestionIndex + 1}
          </h3>
          <div className="flex justify-center gap-4 mb-4">
            {part2Q.image_urls.map((url, idx) => (
              <img key={idx} src={url} alt={`Question image ${idx + 1}`} className="max-h-64 object-contain rounded-lg shadow-md" />
            ))}
          </div>
          <CountdownBar label={currentPhase === "preparation" ? t("add_question_page.preparation") : t("add_question_page.answer")} countdown={countdown} initialCountdown={initialCountdown} />
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
            {currentPartName} - {t("add_question_page.question")} {currentQuestionIndex + 1}
          </h3>
          <CountdownBar label={currentPhase === "preparation" ? t("add_question_page.preparation") : t("add_question_page.answer")} countdown={countdown} initialCountdown={initialCountdown} />
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
      return <p className="text-muted-foreground">{t("add_question_page.unknown_question_type")}</p>;
  }
};

export default TestQuestionDisplay;
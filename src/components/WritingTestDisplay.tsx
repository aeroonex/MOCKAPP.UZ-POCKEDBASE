"use client";

import React from "react";
import { FetchedCEFRQuestion, CEFRWritingRubric } from "@/lib/types";
import { TestPhase } from "@/hooks/use-mock-test-logic";
import { useTranslation } from 'react-i18next';
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WritingTestDisplayProps {
  question: FetchedCEFRQuestion;
  currentPhase: TestPhase;
  countdown: number;
  initialCountdown: number;
  questionIndex: number;
}

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

const WritingTestDisplay: React.FC<WritingTestDisplayProps> = ({
  question,
  currentPhase,
  countdown,
  initialCountdown,
  questionIndex,
}) => {
  const { t } = useTranslation();

  if (currentPhase === "writing_instruction") {
    return (
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-primary dark:text-primary-foreground">{t("cefr_test_page.writing_instruction_title")}</h3>
        <p className="text-xl text-muted-foreground">{t("cefr_test_page.writing_instruction_text")}</p>
        <CountdownBar countdown={countdown} initialCountdown={initialCountdown} />
      </div>
    );
  }

  if (currentPhase === "writing_task") {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-muted-foreground">
          {t("question_management_page.writing_section")} - {t("question_management_page.task")} {questionIndex + 1}
        </h3>
        <CountdownBar label={t("cefr_test_page.write_your_essay")} countdown={countdown} initialCountdown={initialCountdown} />
        <div className="p-4 border rounded-md bg-secondary text-foreground space-y-4">
          <p className="text-2xl font-medium text-center">{question.question_text}</p>
          {question.word_limit && (
            <p className="text-sm text-muted-foreground text-center">
              {t("question_management_page.word_limit")}: {question.word_limit} {t("cefr_test_page.words")}
            </p>
          )}
          <Textarea
            placeholder={t("cefr_test_page.start_writing_here")}
            rows={10}
            className="w-full"
          />
          {question.cefr_rubrics && question.cefr_rubrics.length > 0 && (
            <ScrollArea className="h-[150px] p-2 border rounded-md bg-card">
              <h4 className="font-semibold mb-2">{t("question_management_page.rubrics")}:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {question.cefr_rubrics.map((rubric: CEFRWritingRubric) => (
                  <li key={rubric.id}>
                    <strong>{rubric.criterion} ({rubric.score_range}):</strong> {rubric.description}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </div>
    );
  }

  return <p className="text-muted-foreground">{t("add_question_page.unknown_question_type")}</p>;
};

export default WritingTestDisplay;
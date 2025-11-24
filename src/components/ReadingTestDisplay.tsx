"use client";

import React from "react";
import { FetchedCEFRQuestion, CEFRQuestionOption } from "@/lib/types";
import { TestPhase } from "@/hooks/use-mock-test-logic";
import { useTranslation } from 'react-i18next';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReadingTestDisplayProps {
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

const ReadingTestDisplay: React.FC<ReadingTestDisplayProps> = ({
  question,
  currentPhase,
  countdown,
  initialCountdown,
  questionIndex,
}) => {
  const { t } = useTranslation();

  if (currentPhase === "reading_instruction") {
    return (
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-primary dark:text-primary-foreground">{t("cefr_test_page.reading_instruction_title")}</h3>
        <p className="text-xl text-muted-foreground">{t("cefr_test_page.reading_instruction_text")}</p>
        <CountdownBar countdown={countdown} initialCountdown={initialCountdown} />
      </div>
    );
  }

  if (currentPhase === "reading_passage") {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-muted-foreground">
          {t("question_management_page.reading_section")} - {t("question_management_page.passage")} {questionIndex + 1}
        </h3>
        <CountdownBar label={t("cefr_test_page.read_the_passage")} countdown={countdown} initialCountdown={initialCountdown} />
        <ScrollArea className="h-[300px] p-4 border rounded-md bg-secondary text-foreground prose dark:prose-invert">
          {question.question_text && <p>{question.question_text}</p>}
          {question.image_urls && question.image_urls.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-4">
              {question.image_urls.map((url, idx) => (
                <img key={idx} src={url} alt={`Reading image ${idx + 1}`} className="max-h-48 object-contain rounded-lg shadow-md" />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  if (currentPhase === "reading_question") {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-muted-foreground">
          {t("question_management_page.reading_section")} - {t("add_question_page.question")} {questionIndex + 1}
        </h3>
        <CountdownBar label={t("cefr_test_page.answer_the_question")} countdown={countdown} initialCountdown={initialCountdown} />
        <div className="min-h-[100px] flex flex-col items-center justify-center p-4 border rounded-md bg-secondary text-foreground">
          <p className="text-2xl font-medium text-center mb-4">{question.correct_answer}</p> {/* Reading question is in correct_answer field */}
          {question.question_type === 'multiple_choice' && question.cefr_options && (
            <RadioGroup className="w-full space-y-2">
              {question.cefr_options.map((option: CEFRQuestionOption) => (
                <div key={option.id} className="flex items-center space-x-2 p-2 border rounded-md">
                  <RadioGroupItem value={option.id} id={`option-${option.id}`} />
                  <Label htmlFor={`option-${option.id}`} className="text-lg">{option.option_text}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>
      </div>
    );
  }

  return <p className="text-muted-foreground">{t("add_question_page.unknown_question_type")}</p>;
};

export default ReadingTestDisplay;
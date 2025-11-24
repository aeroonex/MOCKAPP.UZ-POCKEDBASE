"use client";

import React from "react";
import { FetchedCEFRQuestion, CEFRQuestionOption } from "@/lib/types";
import { TestPhase } from "@/hooks/use-mock-test-logic";
import { useTranslation } from 'react-i18next';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";

interface ListeningTestDisplayProps {
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

const ListeningTestDisplay: React.FC<ListeningTestDisplayProps> = ({
  question,
  currentPhase,
  countdown,
  initialCountdown,
  questionIndex,
}) => {
  const { t } = useTranslation();

  if (currentPhase === "listening_instruction") {
    return (
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-primary dark:text-primary-foreground">{t("cefr_test_page.listening_instruction_title")}</h3>
        <p className="text-xl text-muted-foreground">{t("cefr_test_page.listening_instruction_text")}</p>
        <CountdownBar countdown={countdown} initialCountdown={initialCountdown} />
      </div>
    );
  }

  if (currentPhase === "listening_audio") {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-muted-foreground">
          {t("question_management_page.listening_section")} - {t("add_question_page.question")} {questionIndex + 1}
        </h3>
        <CountdownBar label={t("cefr_test_page.listening_audio_playing")} countdown={countdown} initialCountdown={initialCountdown} />
        {question.audio_url && (
          <audio controls autoPlay src={question.audio_url} className="w-full mt-4"></audio>
        )}
        <div className="min-h-[100px] flex flex-col items-center justify-center p-4 border rounded-md bg-secondary text-foreground">
          <p className="text-2xl font-medium text-center">{t("cefr_test_page.listen_carefully")}</p>
        </div>
      </div>
    );
  }

  if (currentPhase === "listening_answer") {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-muted-foreground">
          {t("question_management_page.listening_section")} - {t("add_question_page.question")} {questionIndex + 1}
        </h3>
        <CountdownBar label={t("cefr_test_page.answer_the_question")} countdown={countdown} initialCountdown={initialCountdown} />
        <div className="min-h-[100px] flex flex-col items-center justify-center p-4 border rounded-md bg-secondary text-foreground">
          <p className="text-2xl font-medium text-center mb-4">{question.question_text}</p>
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
          {/* Add other question types for listening if needed, e.g., fill-in-the-blanks */}
        </div>
      </div>
    );
  }

  return <p className="text-muted-foreground">{t("add_question_page.unknown_question_type")}</p>;
};

export default ListeningTestDisplay;
"use client";

import React from "react";
import {
  SpeakingQuestion,
  SpeakingPart,
  Part1_1Question,
  Part1_2Question,
  Part2Question,
  Part3Question,
} from "@/lib/types";
import { TestPhase } from "@/hooks/use-mock-test-logic";
import { Hourglass, Mic, BookOpen, Brain } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";

interface TestQuestionDisplayProps {
  currentQ: SpeakingQuestion | undefined;
  currentPartName: SpeakingPart;
  currentQuestionIndex: number;
  currentSubQuestionIndex: number;
  currentPhase: TestPhase;
  countdown: number;
  initialCountdown: number;
}

/** 125 -> "2:05", 45 -> "0:45" */
const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

/** Yorliqdagi oxirgi ikki nuqtani olib tashlaydi ("Javob:" -> "Javob") */
const stripColon = (s: string) => s.replace(/[:：]\s*$/, "");

const PhaseIcon: React.FC<{ phase: TestPhase; className?: string }> = ({ phase, className }) => {
  if (phase === "speaking") return <Mic className={className} />;
  if (phase === "preparation") return <Brain className={className} />;
  return <BookOpen className={className} />;
};

const CountdownBar: React.FC<{ label?: string; phase: TestPhase; countdown: number; initialCountdown: number }> = ({
  label,
  phase,
  countdown,
  initialCountdown,
}) => {
  const progress = initialCountdown > 0 ? (countdown / initialCountdown) * 100 : 0;
  // Oxirgi 10 soniya — ogohlantiruvchi rang (faqat javob/tayyorgarlik bosqichlarida)
  const low = countdown <= 10 && initialCountdown > 15 && (phase === "speaking" || phase === "preparation");

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        {label ? (
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <PhaseIcon phase={phase} className={cn("h-3.5 w-3.5", phase === "speaking" && "text-red-500")} />
            {stripColon(label)}
          </p>
        ) : (
          <span />
        )}
        <p
          className={cn(
            "text-base font-bold leading-none tabular-nums sm:text-lg",
            low ? "exam-time-low text-red-500" : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {formatSeconds(countdown)}
        </p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", low ? "bg-red-500" : "bg-primary")}
          style={{ width: `${progress}%`, transition: "width 1s linear" }}
        />
      </div>
    </div>
  );
};

const QuestionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div
    className={cn(
      "flex items-center justify-center rounded-xl border border-border bg-muted/40 px-5 py-4 text-center sm:px-6 sm:py-5",
      className,
    )}
  >
    <p className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">{children}</p>
  </div>
);

const QuestionImages: React.FC<{ urls: string[] }> = ({ urls }) => {
  if (!urls?.length) return null;
  return (
    <div className="flex justify-center gap-3 sm:gap-4">
      {urls.map((url, idx) => (
        <img
          key={idx}
          src={url}
          alt={`Question image ${idx + 1}`}
          className="max-h-64 rounded-xl border border-border bg-black/20 object-contain shadow-md"
        />
      ))}
    </div>
  );
};

const PartHeading: React.FC<{ part: SpeakingPart; kind: string; index: number }> = ({ part, kind, index }) => (
  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
    <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5">{part}</span>
    <span className="text-muted-foreground">{kind} {index + 1}</span>
  </h3>
);

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

  if (currentPhase === "part_finished_announcement" || currentPhase === "next_part_announcement") {
    return (
      <div className="flex min-h-[250px] flex-col items-center justify-center gap-4 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
          <Hourglass className="h-9 w-9 animate-spin [animation-duration:3s]" />
        </div>
        <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
          {currentPhase === 'part_finished_announcement' ? t("add_question_page.part_finished") : t("add_question_page.prepare_for_next_part")}
        </h3>
        <div className="w-full max-w-md">
          <CountdownBar phase={currentPhase} countdown={countdown} initialCountdown={initialCountdown} />
        </div>
      </div>
    );
  }

  if (currentPhase === "pre_test_countdown") {
    return (
      <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 text-center">
        <h3 className="text-2xl font-extrabold tracking-tight text-foreground">{t("add_question_page.please_prepare_yourself")}</h3>
        <p className="text-7xl font-black tabular-nums text-primary sm:text-8xl">{countdown}</p>
        <p className="text-muted-foreground">{t("add_question_page.test_starts_in", { countdown })}</p>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">{t("add_question_page.no_questions_in_this_part")}</h3>
        <p className="text-muted-foreground">{t("add_question_page.add_more_questions_to_continue")}</p>
      </div>
    );
  }

  switch (currentQ.type) {
    case "Part 1.1": {
      const part1_1Q = currentQ as Part1_1Question;
      return (
        <div className="space-y-5">
          <PartHeading part={currentPartName} kind={t("add_question_page.question")} index={currentQuestionIndex} />
          <QuestionCard>{part1_1Q.sub_questions[currentSubQuestionIndex]}</QuestionCard>
          <CountdownBar
            label={currentPhase === "reading_question" ? t("add_question_page.reading") : t("add_question_page.answer")}
            phase={currentPhase}
            countdown={countdown}
            initialCountdown={initialCountdown}
          />
        </div>
      );
    }
    case "Part 1.2": {
      const part1_2Q = currentQ as Part1_2Question;
      return (
        <div className="space-y-5">
          <PartHeading part={currentPartName} kind={t("add_question_page.image")} index={currentQuestionIndex} />
          <QuestionCard>{part1_2Q.sub_questions[currentSubQuestionIndex]}</QuestionCard>
          <QuestionImages urls={part1_2Q.image_urls} />
          <CountdownBar
            label={currentPhase === "reading_question" ? t("add_question_page.reading") : t("add_question_page.answer")}
            phase={currentPhase}
            countdown={countdown}
            initialCountdown={initialCountdown}
          />
        </div>
      );
    }
    case "Part 2": {
      const part2Q = currentQ as Part2Question;
      return (
        <div className="space-y-5">
          <PartHeading part={currentPartName} kind={t("add_question_page.question")} index={currentQuestionIndex} />
          <QuestionCard>{part2Q.question_text}</QuestionCard>
          <QuestionImages urls={part2Q.image_urls} />
          <CountdownBar
            label={currentPhase === "preparation" ? t("add_question_page.preparation") : t("add_question_page.answer")}
            phase={currentPhase}
            countdown={countdown}
            initialCountdown={initialCountdown}
          />
        </div>
      );
    }
    case "Part 3": {
      const part3Q = currentQ as Part3Question;
      return (
        <div className="space-y-5">
          <PartHeading part={currentPartName} kind={t("add_question_page.question")} index={currentQuestionIndex} />
          <QuestionCard>{part3Q.question_text}</QuestionCard>
          <QuestionImages urls={part3Q.image_urls} />
          <CountdownBar
            label={currentPhase === "preparation" ? t("add_question_page.preparation") : t("add_question_page.answer")}
            phase={currentPhase}
            countdown={countdown}
            initialCountdown={initialCountdown}
          />
        </div>
      );
    }
    default:
      return <p className="text-muted-foreground">{t("add_question_page.unknown_question_type")}</p>;
  }
};

export default TestQuestionDisplay;

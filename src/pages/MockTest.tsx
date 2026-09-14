"use client";

import React, { useRef } from "react";
import Navbar from "@/components/Navbar";
import { useRecorder } from "@/hooks/use-recorder";
import { ArrowLeft, Mic } from "lucide-react";
import StudentInfoForm from "@/components/StudentInfoForm";
import { useMockTestLogic } from "@/hooks/use-mock-test-logic";
import TestQuestionDisplay from "@/components/TestQuestionDisplay";
import TestControls from "@/components/TestControls";
import ExamLobby from "@/components/ExamLobby";
import DeviceCheck from "@/components/DeviceCheck";
import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 0.61, 0.36, 1] as const;

const MockTest: React.FC = () => {
  const { isRecording, startRecording, stopAllStreams, webcamStream, isRecordingSupported, updateOverlay } = useRecorder();
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const reduce = useReducedMotion();

  const {
    isTestStarted,
    currentPartIndex,
    currentQuestionIndex,
    currentSubQuestionIndex,
    currentPhase,
    countdown,
    initialCountdown,
    studentInfo,
    isStudentInfoFormOpen,
    setIsStudentInfoFormOpen,
    handleStartTestClick,
    handleStudentInfoSave,
    handleEndTest,
    handleResetTest,
    getCurrentQuestion,
    allSpeakingParts,
  } = useMockTestLogic({ startRecording, stopAllStreams });

  const currentPartName = allSpeakingParts[currentPartIndex];
  const currentQ = getCurrentQuestion();
  const isIdle = !isTestStarted && currentPhase === "idle";
  const isRunning = isTestStarted && currentPhase !== "finished";

  // Videoga chiziladigan holat (savol, rasm, bosqich, taymer) — har o'zgarishda kompozitorga beriladi
  React.useEffect(() => {
    if (!isTestStarted) return;
    const strip = (v: string) => v.replace(/[:：]\s*$/, "");
    let phaseLabel = "";
    let question = "";
    let images: string[] = [];
    let questionLabel = "";
    switch (currentPhase) {
      case "pre_test_countdown":
        phaseLabel = strip(t("add_question_page.please_prepare_yourself"));
        question = t("add_question_page.test_starts_in", { countdown });
        break;
      case "part_finished_announcement":
        phaseLabel = strip(t("add_question_page.part_finished"));
        break;
      case "next_part_announcement":
        phaseLabel = strip(t("add_question_page.prepare_for_next_part"));
        break;
      case "reading_question":
        phaseLabel = strip(t("add_question_page.reading"));
        break;
      case "preparation":
        phaseLabel = strip(t("add_question_page.preparation"));
        break;
      case "speaking":
        phaseLabel = strip(t("add_question_page.answer"));
        break;
      default:
        phaseLabel = "";
    }
    if (currentQ && (currentPhase === "reading_question" || currentPhase === "preparation" || currentPhase === "speaking")) {
      if (currentQ.type === "Part 1.1" || currentQ.type === "Part 1.2") {
        question = currentQ.sub_questions?.[currentSubQuestionIndex] ?? "";
      } else {
        question = (currentQ as { question_text?: string }).question_text ?? "";
      }
      images = currentQ.type === "Part 1.1" ? [] : ((currentQ as { image_urls?: string[] }).image_urls ?? []);
      const kind = currentQ.type === "Part 1.2" ? t("add_question_page.image") : t("add_question_page.question");
      questionLabel = `${kind} ${currentQuestionIndex + 1}`;
    }
    updateOverlay({
      part: currentPartName,
      partIndex: currentPartIndex,
      phase: currentPhase,
      phaseLabel,
      questionLabel,
      question,
      images,
      countdown,
      initialCountdown,
      student: studentInfo ? { id: studentInfo.id, name: studentInfo.name, phone: studentInfo.phone } : null,
    });
  }, [isTestStarted, currentPhase, currentQ, currentPartName, currentPartIndex, currentQuestionIndex, currentSubQuestionIndex, countdown, initialCountdown, studentInfo, t, updateOverlay]);

  // Kamera oynasi test boshlanganda (oqim allaqachon ochilgan bo'lsa ham) paydo bo'ladi —
  // shuning uchun oqim elementga callback-ref orqali, element yaratilgan paytda ulanadi
  const attachWebcam = React.useCallback(
    (el: HTMLVideoElement | null) => {
      webcamVideoRef.current = el;
      if (!el) return;
      el.srcObject = webcamStream;
      if (webcamStream) el.play().catch(() => undefined);
    },
    [webcamStream],
  );

  return (
    <div className="min-h-screen flex flex-col">
      {!isTestStarted && <Navbar />}
      <main className="exam-page relative flex w-full flex-grow items-start justify-center px-3 py-5 sm:items-center sm:px-6 sm:py-10">
        {/* Veb-kamera (rasm ichida rasm) va talaba ma'lumotlari */}
        {isTestStarted && (webcamStream || studentInfo) && (
          <div
            className={cn(
              "fixed z-20 rounded-xl border border-border bg-card/95 p-1.5 shadow-lg",
              isMobile ? "top-16 left-2" : "top-20 left-4",
            )}
          >
            {webcamStream && (
              <div className="flex flex-col items-center">
                <video
                  ref={attachWebcam}
                  autoPlay
                  muted
                  playsInline
                  className={cn("rounded-lg bg-black object-cover", isMobile ? "h-20 w-24" : "h-24 w-32")}
                />
                <p className="mt-1 text-[10px] font-semibold tracking-wide text-muted-foreground">edumock.uz</p>
              </div>
            )}
            {isTestStarted && studentInfo && !isMobile && (
              <dl className="mt-1.5 space-y-0.5 border-t border-border px-1 pt-2 text-xs text-foreground">
                <div className="flex gap-1.5"><dt className="font-semibold text-muted-foreground">{t("mock_test_page.student_id")}:</dt><dd>{studentInfo.id}</dd></div>
                <div className="flex gap-1.5"><dt className="font-semibold text-muted-foreground">{t("mock_test_page.student_name")}:</dt><dd>{studentInfo.name}</dd></div>
                <div className="flex gap-1.5"><dt className="font-semibold text-muted-foreground">{t("mock_test_page.student_phone")}:</dt><dd>{studentInfo.phone}</dd></div>
              </dl>
            )}
          </div>
        )}

        {isRecording && (
          <div className="fixed top-3 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/75 px-3 py-1.5 text-xs font-bold tracking-wider text-red-400 shadow-lg">
            <span className="rec-dot h-2 w-2 rounded-full bg-red-500" /> REC
          </div>
        )}

        <motion.section
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="w-full max-w-3xl"
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10">
            {/* Yuqori qator: orqaga + belgi */}
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-6">
              {!isTestStarted ? (
                <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground">
                  <Link to="/home">
                    <ArrowLeft className="h-4 w-4" />
                    {t("common.back")}
                  </Link>
                </Button>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary"><Mic className="h-3.5 w-3.5" /></span>
                  {t("mock_test_page.mock_speaking_test")}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {isRunning ? (
                  <>
                    <span className="rec-dot h-1.5 w-1.5 rounded-full bg-red-500" />
                    {t("mock_test_page.live")} · {currentPartName}
                  </>
                ) : (
                  t("mock_test_page.lobby_kicker")
                )}
              </span>
            </div>

            {/* Test davomida: qismlar bo'yicha progress */}
            {isRunning && (
              <ol className="grid grid-cols-4 gap-1.5 px-4 pt-4 sm:px-6" aria-label={t("mock_test_page.current_part")}>
                {allSpeakingParts.map((p, i) => {
                  const state = i < currentPartIndex ? "done" : i === currentPartIndex ? "active" : "todo";
                  return (
                    <li key={p} className="min-w-0">
                      <div
                        className={cn(
                          "h-1.5 rounded-full transition-colors",
                          state === "done" && "bg-primary/50",
                          state === "active" && "bg-primary",
                          state === "todo" && "bg-muted",
                        )}
                      />
                      <p className={cn("mt-1.5 truncate text-[10px] font-bold uppercase tracking-wider", state === "active" ? "text-primary" : "text-muted-foreground")}>
                        {p}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="px-4 py-6 sm:px-8 sm:py-8">
              {isIdle && (
                <header className="mb-6">
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                    {t("mock_test_page.mock_speaking_test")}
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground sm:text-[15px]">{t("mock_test_page.lobby_desc")}</p>
                </header>
              )}

              {isIdle && (
                <div className="mb-8 space-y-7">
                  <ExamLobby />
                  <DeviceCheck webcamStream={webcamStream} />
                </div>
              )}

              {isRunning && (
                <TestQuestionDisplay
                  currentQ={currentQ}
                  currentPartName={currentPartName}
                  currentQuestionIndex={currentQuestionIndex}
                  currentSubQuestionIndex={currentSubQuestionIndex}
                  currentPhase={currentPhase}
                  countdown={countdown}
                  initialCountdown={initialCountdown}
                />
              )}

              <div className={cn(isRunning && "mt-6")}>
                <TestControls
                  isTestStarted={isTestStarted}
                  currentPhase={currentPhase}
                  handleStartTestClick={handleStartTestClick}
                  handleEndTest={handleEndTest}
                  handleResetTest={handleResetTest}
                  isRecordingSupported={isRecordingSupported}
                />
              </div>
            </div>
          </div>
        </motion.section>
      </main>
      <StudentInfoForm
        isOpen={isStudentInfoFormOpen}
        onClose={() => setIsStudentInfoFormOpen(false)}
        onSave={handleStudentInfoSave}
      />
    </div>
  );
};

export default MockTest;

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TestPhase } from "@/hooks/use-mock-test-logic";
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Loader2, MonitorSmartphone, Play, Square } from "lucide-react";

interface TestControlsProps {
  isTestStarted: boolean;
  currentPhase: TestPhase;
  handleStartTestClick: () => void;
  handleEndTest: () => void;
  handleResetTest: () => void;
  isRecordingSupported: boolean;
}

const TestControls: React.FC<TestControlsProps> = ({
  isTestStarted,
  currentPhase,
  handleStartTestClick,
  handleEndTest,
  handleResetTest,
  isRecordingSupported,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-5">
      {!isTestStarted && currentPhase === "idle" && (
        <>
          {!isRecordingSupported && (
            <div
              role="alert"
              className="flex w-full items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
            >
              <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("mock_test_page.recording_not_supported_mobile_info")}</span>
            </div>
          )}

          <div className="mt-1">
            <button
              type="button"
              onClick={handleStartTestClick}
              disabled={!isRecordingSupported}
              className="exam-cta group"
            >
              <Play className="h-5 w-5 fill-current" />
              {t("mock_test_page.start_test")}
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("mock_test_page.duration_hint")} · {t("mock_test_page.no_pause_hint")}
          </p>
        </>
      )}

      {isTestStarted && currentPhase !== "finished" && (
        <div className="mt-2 flex w-full max-w-md flex-col gap-2 sm:flex-row">
          <Button variant="secondary" className="flex-1 gap-2" disabled>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("mock_test_page.next_question_auto")}
          </Button>
          {/* Tugatish — tasodifan bosilmasligi uchun tasdiqlash so'raladi */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex-1 gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500">
                <Square className="h-3.5 w-3.5 fill-current" />
                {t("mock_test_page.end_test")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="z-[9999]">
              <AlertDialogHeader>
                <AlertDialogTitle>{t("mock_test_page.end_test_confirm_title")}</AlertDialogTitle>
                <AlertDialogDescription>{t("mock_test_page.end_test_confirm_desc")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("mock_test_page.end_test_confirm_no")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleEndTest} className="bg-red-600 text-white hover:bg-red-700">
                  {t("mock_test_page.end_test_confirm_yes")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {currentPhase === "finished" && (
        // Test yakunlandi: o'quvchiga faqat minnatdorchilik — qayta topshirish tugmasi yo'q (urinishlar cheklangan)
        <div className="w-full max-w-md space-y-4 py-4 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/10">
            <Check className="h-10 w-10" strokeWidth={3} />
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{t("mock_test_page.finished_thanks")}</h3>
          <p className="text-muted-foreground">{t("mock_test_page.finished_desc")}</p>
          <p className="text-xs text-muted-foreground">{t("add_question_page.last_session_available_in_records")}</p>
          <Button onClick={handleResetTest} variant="outline" size="sm" className="mt-2">
            {t("mock_test_page.finished_next")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TestControls;

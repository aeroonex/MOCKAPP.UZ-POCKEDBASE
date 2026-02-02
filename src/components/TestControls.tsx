"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { TestPhase } from "@/hooks/use-mock-test-logic";
import { useTranslation } from 'react-i18next';

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
    <div className="space-y-6">
      {!isTestStarted && currentPhase === "idle" && (
        <>
          {!isRecordingSupported && (
            <p className="text-red-500 text-sm mb-4">
              {t("mock_test_page.recording_not_supported_mobile_info")}
            </p>
          )}
          {/* Custom button design from Uiverse.io */}
          <div className="relative inline-flex items-center justify-center group">
            <div
              className="absolute inset-0 duration-1000 opacity-60 transition-all bg-gradient-to-r from-indigo-500 via-pink-500 to-yellow-400 rounded-xl blur-lg filter group-hover:opacity-100 group-hover:duration-200"
            ></div>
            <button
              role="button"
              onClick={handleStartTestClick}
              disabled={!isRecordingSupported}
              className="group relative inline-flex items-center justify-center text-base rounded-xl bg-gray-900 px-8 py-4 font-semibold text-white transition-all duration-200 hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 hover:shadow-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              title={t("mock_test_page.start_test_with_recording")}
            >
              {t("mock_test_page.start_test_with_recording")}
              <svg
                aria-hidden="true"
                viewBox="0 0 10 10"
                height="10"
                width="10"
                fill="none"
                className="mt-0.5 ml-2 -mr-1 stroke-white stroke-2"
              >
                <path
                  d="M0 5h7"
                  className="transition opacity-0 group-hover:opacity-100"
                ></path>
                <path
                  d="M1 1l4 4-4 4"
                  className="transition group-hover:translate-x-[3px]"
                ></path>
              </svg>
            </button>
          </div>
        </>
      )}

      {isTestStarted && currentPhase !== "finished" && (
        <div className="flex gap-2 mt-4">
          <Button className="flex-grow" disabled={true}>
            {t("mock_test_page.next_question_auto")}
          </Button>
          <Button onClick={handleEndTest} variant="destructive" className="flex-grow">
            {t("mock_test_page.end_test")}
          </Button>
        </div>
      )}

      {currentPhase === "finished" && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">{t("add_question_page.test_finished")}</h3>
          <p className="text-muted-foreground">{t("add_question_page.all_questions_reviewed")}</p>
          <Button onClick={handleResetTest} variant="outline" className="w-full">
            {t("add_question_page.restart_test")}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            {t("add_question_page.last_session_available_in_records")}
          </p>
        </div>
      )}
    </div>
  );
};

export default TestControls;
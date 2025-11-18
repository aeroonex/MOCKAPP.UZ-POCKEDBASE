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
}

const TestControls: React.FC<TestControlsProps> = ({
  isTestStarted,
  currentPhase,
  handleStartTestClick,
  handleEndTest,
  handleResetTest,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {!isTestStarted && currentPhase === "idle" && (
        <Button onClick={handleStartTestClick} size="lg" className="text-lg px-8 py-4">
          {t("mock_test_page.start_test_with_recording")}
        </Button>
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
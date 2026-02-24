"use client";

import React, { useRef } from "react";
import Navbar from "@/components/Navbar";
import AppFooter from "@/components/AppFooter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useRecorder } from "@/hooks/use-recorder";
import { Video, ArrowLeft } from "lucide-react";
import StudentInfoForm from "@/components/StudentInfoForm";
import { useMockTestLogic } from "@/hooks/use-mock-test-logic";
import TestQuestionDisplay from "@/components/TestQuestionDisplay";
import TestControls from "@/components/TestControls";
import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const MockTest: React.FC = () => {
  const { isRecording, startRecording, stopAllStreams, webcamStream, isRecordingSupported } = useRecorder();
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const { t } = useTranslation();
  const isMobile = useIsMobile();

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

  React.useEffect(() => {
    if (webcamVideoRef.current) {
      if (webcamStream) {
        webcamVideoRef.current.srcObject = webcamStream;
      } else {
        webcamVideoRef.current.srcObject = null;
      }
    }
  }, [webcamStream]);

  return (
    <div className="min-h-screen flex flex-col">
      {!isTestStarted && <Navbar />}
      <main className="flex-grow mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-8 flex items-center justify-center relative bg-gradient-to-br from-background to-secondary/50 min-h-[calc(100vh-120px)]">
        {(webcamStream || (isTestStarted && studentInfo)) && (
          <Card className={cn(
            "fixed z-20 p-2 bg-card shadow-lg border border-border",
            isMobile ? "top-16 left-2" : "top-20 left-4"
          )}>
            <CardContent className="p-0 space-y-2">
              {webcamStream && (
                <div className="flex flex-col items-center">
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    muted
                    className={cn(
                      "rounded-lg shadow-lg border-2 border-primary-foreground bg-black",
                      isMobile ? "w-24 h-20" : "w-32 h-24"
                    )}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">edumock.uz</p>
                </div>
              )}
              {isTestStarted && studentInfo && !isMobile && (
                <div className="p-2 border-t border-border mt-2 pt-2">
                  <p className="text-sm text-foreground"><strong>{t("mock_test_page.student_id")}:</strong> {studentInfo.id}</p>
                  <p className="text-sm text-foreground"><strong>{t("mock_test_page.student_name")}:</strong> {studentInfo.name}</p>
                  <p className="text-sm text-foreground"><strong>{t("mock_test_page.student_phone")}:</strong> {studentInfo.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isRecording && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-red-500 font-semibold z-20 bg-black bg-opacity-70 px-3 py-2 rounded-md">
            <Video className="h-5 w-5 animate-pulse" /> REC
          </div>
        )}

        <Card className={cn("w-full relative card-glow", isMobile ? "max-w-none" : "max-w-2xl")}>
          <CardHeader className="py-4 sm:py-6">
            <div className="flex justify-between items-center w-full">
              {!isTestStarted && (
                <Link to="/home">
                  <Button variant="default" className="bg-primary hover:bg-primary/90">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("common.back")}
                  </Button>
                </Link>
              )}
              <CardTitle className={cn(
                "font-bold text-center flex-grow",
                isMobile ? "text-lg" : "text-xl sm:text-3xl",
                isTestStarted ? "ml-0" : "ml-4"
              )}>
                {t("mock_test_page.mock_speaking_test")}
              </CardTitle>
              {!isTestStarted && <div className={cn(isMobile ? "w-10" : "w-[80px]", "h-4")} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-4 sm:p-6">
            {isTestStarted && currentPhase !== "finished" && (
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

            <TestControls
              isTestStarted={isTestStarted}
              currentPhase={currentPhase}
              handleStartTestClick={handleStartTestClick}
              handleEndTest={handleEndTest}
              handleResetTest={handleResetTest}
              isRecordingSupported={isRecordingSupported}
            />
          </CardContent>
        </Card>
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
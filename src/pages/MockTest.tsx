"use client";

import React, { useRef } from "react";
import Navbar from "@/components/Navbar";
import AppFooter from "@/components/AppFooter";
import { Card, CardTitle } from "@/components/ui/card"; // CardHeader va CardContent olib tashlandi
import { useRecorder } from "@/hooks/use-recorder";
import { Video, ArrowLeft } from "lucide-react";
import StudentInfoForm from "@/components/StudentInfoForm";
import { useMockTestLogic } from "@/hooks/use-mock-test-logic";
import TestQuestionDisplay from "@/components/TestQuestionDisplay";
import TestControls from "@/components/TestControls";
import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const MockTest: React.FC = () => {
  const { isRecording, startRecording, stopAllStreams, webcamStream, isRecordingSupported } = useRecorder();
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const { t } = useTranslation();

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
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center relative">
        {(webcamStream || (isTestStarted && studentInfo)) && (
          <div className="fixed top-20 left-4 z-20 flex flex-col items-start space-y-2">
            {webcamStream && (
              <video
                ref={webcamVideoRef}
                autoPlay
                muted
                className="w-32 h-24 rounded-lg shadow-lg border-2 border-primary-foreground bg-black"
              />
            )}
            {isTestStarted && studentInfo && (
              <div className="bg-black bg-opacity-70 text-white p-2 rounded-md text-sm">
                <p><strong>{t("mock_test_page.student_id")}:</strong> {studentInfo.id}</p>
                <p><strong>{t("mock_test_page.student_name")}:</strong> {studentInfo.name}</p>
                <p><strong>{t("mock_test_page.student_phone")}:</strong> {studentInfo.phone}</p>
              </div>
            )}
          </div>
        )}

        {isRecording && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-red-500 font-semibold z-20 bg-black bg-opacity-70 p-2 rounded-md">
            <Video className="h-5 w-5 animate-pulse" /> REC
          </div>
        )}
        
        <Card className="w-full max-w-2xl text-center relative mt-10 p-6 space-y-6"> {/* CardHeader va CardContent classlari Cardga ko'chirildi */}
          <div className="flex justify-between items-center w-full">
            {!isTestStarted && (
              <Link to="/home">
                <Button variant="default" className="bg-primary hover:bg-primary/90">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("common.back")}
                </Button>
              </Link>
            )}
            <CardTitle className={`text-xl sm:text-3xl font-bold text-center flex-grow ${isTestStarted ? 'ml-0' : 'ml-4'}`}>
              {t("mock_test_page.mock_speaking_test")}
            </CardTitle>
            {!isTestStarted && <div className="w-[80px] h-4"></div>}
          </div>
          
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
        </Card>
      </main>
      <AppFooter />
      <StudentInfoForm
        isOpen={isStudentInfoFormOpen}
        onClose={() => setIsStudentInfoFormOpen(false)}
        onSave={handleStudentInfoSave}
      />
    </div>
  );
};

export default MockTest;
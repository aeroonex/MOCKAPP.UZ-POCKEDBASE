"use client";

import React, { useRef } from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter"; // Updated import
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useRecorder } from "@/hooks/use-recorder";
import { Video } from "lucide-react";
import StudentInfoForm from "@/components/StudentInfoForm"; // Import StudentInfoForm
import { useMockTestLogic } from "@/hooks/use-mock-test-logic";
import TestQuestionDisplay from "@/components/TestQuestionDisplay";
import TestControls from "@/components/TestControls";

const MockTest: React.FC = () => {
  const { isRecording, startRecording, stopAllStreams, webcamStream } = useRecorder();
  const webcamVideoRef = useRef<HTMLVideoElement>(null);

  const {
    isTestStarted,
    currentPartIndex,
    currentQuestionIndex,
    currentSubQuestionIndex,
    currentPhase,
    countdown,
    initialCountdown, // Get the initial countdown value
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

  // Manage webcam video stream for display
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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {!isTestStarted && <Navbar />} {/* Navbar'ni test boshlanmaganda ko'rsatish */}
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center relative">
        {/* Webcam Preview and Student Info (grouped in a single fixed container) */}
        {(webcamStream || (isTestStarted && studentInfo)) && (
          <div className="fixed top-4 left-4 z-20 flex flex-col items-start space-y-2">
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
                <p><strong>ID:</strong> {studentInfo.id}</p>
                <p><strong>Ism:</strong> {studentInfo.name}</p>
                <p><strong>Tel:</strong> {studentInfo.phone}</p>
              </div>
            )}
          </div>
        )}

        {isRecording && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-red-500 font-semibold z-20 bg-black bg-opacity-70 p-2 rounded-md">
            <Video className="h-5 w-5 animate-pulse" /> REC
          </div>
        )}
        
        <Card className="w-full max-w-2xl text-center relative">
          <CardHeader className="flex flex-col items-center justify-center gap-4">
            <div className="h-20 w-20 rounded-md flex items-center justify-center bg-gray-100 dark:bg-gray-800 animate-logo-pulse">
              <span className="text-2xl font-extrabold text-red-600">Cefr LC</span>
            </div>
            <div className="text-center">
              <CardTitle className="text-3xl font-bold">Mock Speaking Test</CardTitle>
              <CardDescription>Practice your speaking skills with generated questions.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isTestStarted && currentPhase !== "finished" && (
              <TestQuestionDisplay
                currentQ={currentQ}
                currentPartName={currentPartName}
                currentQuestionIndex={currentQuestionIndex}
                currentSubQuestionIndex={currentSubQuestionIndex}
                currentPhase={currentPhase}
                countdown={countdown}
                initialCountdown={initialCountdown} // Pass it down
              />
            )}

            <TestControls
              isTestStarted={isTestStarted}
              currentPhase={currentPhase}
              handleStartTestClick={handleStartTestClick}
              handleEndTest={handleEndTest}
              handleResetTest={handleResetTest}
            />
          </CardContent>
        </Card>
      </main>
      <CefrCentreFooter /> {/* Replaced MadeWithDyad */}

      {/* StudentInfoForm komponentini bu yerda render qilamiz */}
      <StudentInfoForm
        isOpen={isStudentInfoFormOpen}
        onClose={() => setIsStudentInfoFormOpen(false)}
        onSave={handleStudentInfoSave}
      />
    </div>
  );
};

export default MockTest;
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { StudentInfo, RecordedSession } from "@/lib/types";

interface RecordingData extends RecordedSession {
  blob: Blob | null;
}

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedData, setRecordedData] = useState<RecordingData | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null); // Unified webcam stream for display

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null); // Separate ref for microphone stream
  const startTimeRef = useRef<number>(0);

  // Function to stop all active media streams
  const stopAllStreams = useCallback(() => {
    console.log("Stopping all streams...");
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // This will trigger onstop
    }

    // Stop webcam stream used for display
    webcamStream?.getTracks().forEach(track => track.stop());
    setWebcamStream(null); // Clear state

    // Stop screen and mic streams if they are active (from recording)
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;

    micStreamRef.current?.getTracks().forEach(track => track.stop());
    micStreamRef.current = null;

    setIsRecording(false);
    console.log("All streams stopped.");
  }, [isRecording, webcamStream]);

  // Function to stop the MediaRecorder specifically
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  // Effect to get webcam stream for preview on component mount
  useEffect(() => {
    const getWebcamPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setWebcamStream(stream);
        console.log("Webcam preview stream obtained.");
      } catch (err) {
        console.error("Error getting webcam preview stream:", err);
        showError("Kamera tasvirini olishda xatolik yuz berdi. Kamerangizni tekshiring yoki boshqa ilova ishlatmayotganiga ishonch hosil qiling.");
      }
    };

    getWebcamPreview();

    return () => {
      // Stop only the preview stream if it's not part of an active recording
      if (webcamStream && !isRecording) {
        webcamStream.getTracks().forEach(track => track.stop());
        setWebcamStream(null);
      }
    };
  }, []); // Run only once on mount

  const startRecording = useCallback(async (studentInfo?: StudentInfo): Promise<boolean> => {
    console.log("Attempting to start recording...");
    recordedChunksRef.current = []; // Clear previous chunks

    try {
      // 1. Get screen and system audio
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      if (!screenStream || screenStream.getVideoTracks().length === 0) {
        showError("Ekran ulashish bekor qilindi yoki video stream olinmadi.");
        stopAllStreams();
        return false;
      }
      screenStreamRef.current = screenStream;
      console.log("Screen stream obtained. Video tracks:", screenStream.getVideoTracks().length, "Audio tracks:", screenStream.getAudioTracks().length);
      screenStream.addEventListener('ended', () => {
        console.log("Screen sharing ended by user or system.");
        showError("Ekran ulashish to'xtatildi. Yozib olish tugatildi.");
        stopRecording();
      });
      

      // 2. Get microphone audio
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!micStream || micStream.getAudioTracks().length === 0) {
          showError("Mikrofon ruxsatnomasi berilmadi yoki audio stream olinmadi.");
          stopAllStreams();
          return false;
        }
        micStreamRef.current = micStream;
        console.log("Microphone stream obtained. Audio tracks:", micStream.getAudioTracks().length);
      } catch (micErr) {
        console.error("Error getting microphone stream:", micErr);
        showError("Mikrofon ruxsatnomasi berilmadi. Yozib olish uchun mikrofon kerak.");
        stopAllStreams();
        return false;
      }

      // Combine audio tracks: system audio + microphone audio
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      screenStream.getAudioTracks().forEach(track => {
        console.log("Adding screen audio track to destination:", track.id);
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
      });

      micStream.getAudioTracks().forEach(track => {
        console.log("Adding mic audio track to destination:", track.id);
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
      });

      // Create a new stream with screen video and combined audio (NO WEBCAM VIDEO IN RECORDING)
      const combinedStream = new MediaStream();
      screenStream.getVideoTracks().forEach(track => {
        console.log("Adding screen video track to combined stream:", track.id);
        combinedStream.addTrack(track);
      });
      destination.stream.getAudioTracks().forEach(track => {
        console.log("Adding combined audio track to combined stream:", track.id);
        combinedStream.addTrack(track);
      });

      if (combinedStream.getTracks().length === 0) {
        showError("Yozib olish uchun hech qanday stream topilmadi. Iltimos, ekran va mikrofon ruxsatnomalarini tekshiring.");
        stopAllStreams();
        return false;
      }
      console.log("Combined stream tracks count:", combinedStream.getTracks().length);

      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: "video/webm; codecs=vp8,opus", // Using a common WebM codec
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log("Data available:", event.data.size, "bytes");
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log("MediaRecorder onstop event triggered. Recorded chunks count:", recordedChunksRef.current.length);
        if (recordedChunksRef.current.length === 0) {
          showError("Yozib olishda hech qanday ma'lumot yig'ilmadi. Iltimos, qayta urinib ko'ring.");
          stopAllStreams(); // Ensure all streams are stopped even if no data
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const endTime = Date.now();
        const duration = Math.round((endTime - startTimeRef.current) / 1000);

        const newRecording: RecordingData = {
          blob,
          url,
          timestamp: new Date().toISOString(),
          duration,
          studentInfo,
        };
        setRecordedData(newRecording);
        sessionStorage.setItem("lastRecording", JSON.stringify({
          url,
          timestamp: newRecording.timestamp,
          duration: newRecording.duration,
          studentInfo: newRecording.studentInfo,
        }));
        recordedChunksRef.current = [];
        setIsRecording(false);

        // Stop only the recording-specific streams here
        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
        micStreamRef.current?.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
        
        showSuccess("Recording stopped and saved!");
      };

      mediaRecorderRef.current.onerror = (event: Event) => { // Changed type to Event
        console.error("MediaRecorder error:", event);
        showError("Yozib olishda xatolik yuz berdi: " + ((event as any).error?.message || "Noma'lum xato")); // Cast to any to access .error
        stopAllStreams();
      };

      mediaRecorderRef.current.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      showSuccess("Recording started!");
      console.log("Recording successfully started.");
      return true;
    } catch (err) {
      console.error("General error starting recording:", err);
      showError("Yozib olishni boshlashda kutilmagan xatolik yuz berdi. Ruxsatnomalarni tekshiring.");
      setIsRecording(false);
      stopAllStreams();
      return false;
    }
  }, [stopAllStreams, stopRecording, webcamStream]); // webcamStream is in dependencies for cleanup, but not for recording stream itself

  const resetRecordedData = useCallback(() => {
    setRecordedData(null);
    sessionStorage.removeItem("lastRecording");
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopAllStreams(); // Ensure all streams are stopped when component unmounts
    };
  }, [stopAllStreams]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    stopAllStreams,
    recordedData,
    webcamStream, // Return the unified webcam stream for display
    resetRecordedData,
  };
};
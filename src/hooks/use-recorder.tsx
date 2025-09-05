"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { StudentInfo, RecordedSession } from "@/lib/types"; // Import StudentInfo and RecordedSession

interface RecordingData extends RecordedSession { // Extend RecordedSession
  blob: Blob | null;
}

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedData, setRecordedData] = useState<RecordingData | null>(null);
  const [displayWebcamStream, setDisplayWebcamStream] = useState<MediaStream | null>(null); // State for display webcam

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recordingWebcamStreamRef = useRef<MediaStream | null>(null); // Webcam stream specifically for recording
  const startTimeRef = useRef<number>(0);

  const stopAllStreams = useCallback(() => {
    // Stop MediaRecorder if active
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // This will trigger onstop, which handles screenStreamRef and recordingWebcamStreamRef
    }

    // Explicitly stop display webcam stream
    displayWebcamStream?.getTracks().forEach(track => track.stop());
    setDisplayWebcamStream(null); // Clear state

    // Ensure recording streams are also stopped if not already by onstop
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
    recordingWebcamStreamRef.current?.getTracks().forEach(track => track.stop());
    recordingWebcamStreamRef.current = null;

    setIsRecording(false);
  }, [isRecording, displayWebcamStream]); // Add displayWebcamStream to dependencies

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const startRecording = useCallback(async (studentInfo?: StudentInfo): Promise<boolean> => {
    try {
      // 1. Request display webcam stream (video only) for UI preview
      let newDisplayWebcamStream: MediaStream | null = null;
      try {
        newDisplayWebcamStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false, // Only video for display
        });
        setDisplayWebcamStream(newDisplayWebcamStream);
      } catch (webcamErr) {
        console.error("Error getting display webcam stream for UI preview:", webcamErr);
        // Don't stop everything if only display webcam fails, but log it.
        // The recording webcam will still be requested.
      }

      // 2. Request screen and system audio
      let screenStream: MediaStream | null = null;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        if (!screenStream) { // User cancelled or denied
          showError("Ekran ulashish bekor qilindi yoki ruxsat berilmadi.");
          stopAllStreams();
          return false;
        }
        screenStreamRef.current = screenStream;
        screenStream.addEventListener('ended', () => {
          console.log("Screen sharing ended by user or system.");
          showError("Ekran ulashish to'xtatildi. Yozib olish tugatildi.");
          stopRecording();
        });
      } catch (screenErr) {
        console.error("Error getting screen stream:", screenErr);
        showError("Ekran ulashishni boshlashda xatolik yuz berdi. Ruxsatnomalarni tekshiring.");
        stopAllStreams();
        return false;
      }

      // 3. Request webcam and microphone audio for recording
      let recordingWebcamStream: MediaStream | null = null;
      try {
        recordingWebcamStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!recordingWebcamStream) { // User cancelled or denied
          showError("Kamera yoki mikrofon ruxsatnomasi berilmadi.");
          stopAllStreams();
          return false;
        }
        recordingWebcamStreamRef.current = recordingWebcamStream;
      } catch (micWebcamErr) {
        console.error("Error getting recording webcam/mic stream:", micWebcamErr);
        showError("Kamera yoki mikrofon ruxsatnomasi berilmadi.");
        stopAllStreams();
        return false;
      }

      // Ensure both screenStream and recordingWebcamStream are not null before proceeding
      if (!screenStream || !recordingWebcamStream) {
          showError("Yozib olish uchun barcha kerakli ruxsatnomalar berilmadi.");
          stopAllStreams();
          return false;
      }

      // Combine audio tracks: system audio + microphone audio from recording webcam
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      screenStream.getAudioTracks().forEach(track => {
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
      });

      recordingWebcamStream.getAudioTracks().forEach(track => {
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
      });

      // Create a new stream with screen video, recording webcam video, and combined audio
      const combinedStream = new MediaStream();
      screenStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
      recordingWebcamStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
      destination.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));

      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: "video/webm; codecs=vp8,opus", // WebM is widely supported
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log("MediaRecorder onstop event triggered."); // Debugging log
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const endTime = Date.now();
        const duration = Math.round((endTime - startTimeRef.current) / 1000);

        const newRecording: RecordingData = {
          blob,
          url,
          timestamp: new Date().toISOString(),
          duration,
          studentInfo, // Include student info
        };
        setRecordedData(newRecording);
        sessionStorage.setItem("lastRecording", JSON.stringify({
          url,
          timestamp: newRecording.timestamp,
          duration: newRecording.duration,
          studentInfo: newRecording.studentInfo, // Include student info in session storage
        }));
        recordedChunksRef.current = [];
        setIsRecording(false);

        // Stop tracks for the recording streams only
        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
        recordingWebcamStreamRef.current?.getTracks().forEach(track => track.stop());
        recordingWebcamStreamRef.current = null;
        
        showSuccess("Recording stopped and saved!");
      };

      recordedChunksRef.current = [];
      mediaRecorderRef.current.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      showSuccess("Recording started!");
      return true; // Successfully started recording
    } catch (err) {
      console.error("General error starting recording:", err);
      showError("Yozib olishni boshlashda kutilmagan xatolik yuz berdi. Ruxsatnomalarni tekshiring.");
      setIsRecording(false);
      stopAllStreams();
      return false;
    }
  }, [stopAllStreams, displayWebcamStream, stopRecording]);

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
    webcamStream: displayWebcamStream, // Return the state variable
    resetRecordedData,
  };
};
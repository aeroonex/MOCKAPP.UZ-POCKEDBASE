"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { showSuccess, showError } from "@/utils/toast";

interface RecordingData {
  blob: Blob | null;
  url: string | null;
  timestamp: string;
  duration: number; // in seconds
}

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedData, setRecordedData] = useState<RecordingData | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      // Request screen and system audio
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = screenStream;

      // Request webcam and microphone audio
      const webcamStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      webcamStreamRef.current = webcamStream;

      // Combine audio tracks: system audio + microphone audio
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      screenStream.getAudioTracks().forEach(track => {
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
      });

      webcamStream.getAudioTracks().forEach(track => {
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
      });

      // Create a new stream with screen video, webcam video, and combined audio
      const combinedStream = new MediaStream();
      screenStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
      webcamStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
      destination.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));

      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: "video/webm; codecs=vp8,opus",
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const endTime = Date.now();
        const duration = Math.round((endTime - startTimeRef.current) / 1000);

        const newRecording: RecordingData = {
          blob,
          url,
          timestamp: new Date().toISOString(),
          duration,
        };
        setRecordedData(newRecording);
        sessionStorage.setItem("lastRecording", JSON.stringify({
          url,
          timestamp: newRecording.timestamp,
          duration: newRecording.duration,
        }));
        recordedChunksRef.current = [];
        setIsRecording(false);

        // Stop all tracks to release camera/mic/screen
        webcamStreamRef.current?.getTracks().forEach(track => track.stop());
        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        // Clear references after stopping tracks
        webcamStreamRef.current = null;
        screenStreamRef.current = null;
        showSuccess("Recording stopped and saved!");
      };

      recordedChunksRef.current = [];
      mediaRecorderRef.current.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      showSuccess("Recording started!");
    } catch (err) {
      console.error("Error starting recording:", err);
      showError("Failed to start recording. Please check camera/microphone/screen permissions.");
      setIsRecording(false);
      // Ensure streams are stopped and references cleared if an error occurs during setup
      webcamStreamRef.current?.getTracks().forEach(track => track.stop());
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
      screenStreamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const resetRecordedData = useCallback(() => {
    setRecordedData(null);
    sessionStorage.removeItem("lastRecording");
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      webcamStreamRef.current?.getTracks().forEach(track => track.stop());
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null; // Clear reference on unmount
      screenStreamRef.current = null; // Clear reference on unmount
    };
  }, [isRecording, stopRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordedData,
    webcamStream: webcamStreamRef.current,
    resetRecordedData,
  };
};
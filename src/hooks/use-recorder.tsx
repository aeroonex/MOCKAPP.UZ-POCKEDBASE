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
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recordingWebcamStreamRef = useRef<MediaStream | null>(null); // Webcam stream specifically for recording
  const displayWebcamStreamRef = useRef<MediaStream | null>(null); // Webcam stream specifically for display
  const startTimeRef = useRef<number>(0);

  const stopAllStreams = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // This will trigger onstop, which handles screenStreamRef and recordingWebcamStreamRef
    }

    // Explicitly stop display webcam stream if it's active
    displayWebcamStreamRef.current?.getTracks().forEach(track => track.stop());
    displayWebcamStreamRef.current = null;

    // Ensure recording streams are also stopped if not already by onstop
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
    recordingWebcamStreamRef.current?.getTracks().forEach(track => track.stop());
    recordingWebcamStreamRef.current = null;

    setIsRecording(false);
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      // Request screen and system audio
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = screenStream;

      // Request webcam and microphone audio for recording
      const recordingWebcamStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      recordingWebcamStreamRef.current = recordingWebcamStream;

      // If display webcam is not yet active, start it (video only)
      if (!displayWebcamStreamRef.current) {
        const displayWebcamStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false, // Only video for display
        });
        displayWebcamStreamRef.current = displayWebcamStream;
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
    } catch (err) {
      console.error("Error starting recording:", err);
      showError("Failed to start recording. Please check camera/microphone/screen permissions.");
      setIsRecording(false);
      // Ensure all streams are stopped if an error occurs during setup
      stopAllStreams(); // Use the comprehensive stop function
    }
  }, [stopAllStreams]); // Dependency on stopAllStreams

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
      stopAllStreams(); // Ensure all streams are stopped when component unmounts
    };
  }, [stopAllStreams]);

  return {
    isRecording,
    startRecording,
    stopRecording, // This will only stop the MediaRecorder, not the display webcam
    stopAllStreams, // New function to stop everything
    recordedData,
    webcamStream: displayWebcamStreamRef.current, // Return the display-only webcam stream
    resetRecordedData,
  };
};
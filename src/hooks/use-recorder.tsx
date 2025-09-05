"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { StudentInfo, RecordedSession } from "@/lib/types";

interface RecordingData extends RecordedSession {
  blob: Blob | null;
}

const MAX_RECORDING_DURATION_MS = 20 * 60 * 1000; // 20 minutes in milliseconds
const MIME_TYPE = "video/webm; codecs=vp8,opus"; // Using a common WebM codec

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedData, setRecordedData] = useState<RecordingData | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null); // Unified webcam stream for display

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null); // Separate ref for microphone stream
  const startTimeRef = useRef<number>(0);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Timeout for auto-stopping recording

  // Function to clear the recording timeout
  const clearRecordingTimeout = useCallback(() => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
      console.log("Recorder: Recording auto-stop timeout cleared.");
    }
  }, []);

  // Function to stop the MediaRecorder specifically
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      console.log("Recorder: Explicitly stopping recording. Current state:", mediaRecorderRef.current.state);
      mediaRecorderRef.current.stop();
      clearRecordingTimeout(); // Clear auto-stop timeout
    }
  }, [clearRecordingTimeout]); // isRecording is no longer a direct dependency for useCallback

  // Function to stop all active media streams
  const stopAllStreams = useCallback(() => {
    console.log("Recorder: Stopping all streams...");
    clearRecordingTimeout(); // Clear auto-stop timeout

    // Check if mediaRecorderRef.current exists and is active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      console.log("Recorder: Stopping MediaRecorder. Current state:", mediaRecorderRef.current.state);
      mediaRecorderRef.current.stop(); // This will trigger onstop
    }

    // Stop webcam stream used for display
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      console.log("Recorder: Webcam preview stream stopped.");
    }
    setWebcamStream(null); // Clear state

    // Stop screen and mic streams if they are active (from recording)
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      console.log("Recorder: Screen stream stopped.");
      screenStreamRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      console.log("Recorder: Microphone stream stopped.");
      micStreamRef.current = null;
    }

    // Only set setIsRecording to false if it's currently true, to avoid unnecessary re-renders
    setIsRecording(prev => {
      if (prev) {
        console.log("Recorder: Setting isRecording to false.");
        return false;
      }
      return prev;
    });
    console.log("Recorder: All streams stopped.");
  }, [webcamStream, clearRecordingTimeout]); // isRecording is no longer a direct dependency for useCallback


  // Effect to get webcam stream for preview on component mount
  useEffect(() => {
    const getWebcamPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setWebcamStream(stream);
        console.log("Recorder: Webcam preview stream obtained.");
      } catch (err) {
        console.error("Recorder: Error getting webcam preview stream:", err);
        showError("Kamera tasvirini olishda xatolik yuz berdi. Kamerangizni tekshiring yoki boshqa ilova ishlatmayotganiga ishonch hosil qiling.");
      }
    };

    getWebcamPreview();

    return () => {
      // Stop only the preview stream if it's not part of an active recording
      // This cleanup should only run on actual unmount or if webcamStream changes
      if (webcamStream) { // Check if webcamStream exists before trying to stop
        webcamStream.getTracks().forEach(track => track.stop());
        setWebcamStream(null);
        console.log("Recorder: Webcam preview stream cleaned up on unmount.");
      }
    };
  }, []); // Run only once on mount, webcamStream is handled by its own state update

  const startRecording = useCallback(async (studentInfo?: StudentInfo): Promise<boolean> => {
    console.log("Recorder: Attempting to start recording...");
    recordedChunksRef.current = []; // Clear previous chunks

    // Check for MediaRecorder support
    if (!MediaRecorder.isTypeSupported(MIME_TYPE)) {
      showError(`Yozib olish formati (${MIME_TYPE}) brauzeringiz tomonidan qo'llab-quvvatlanmaydi.`);
      console.error(`Recorder: MIME type ${MIME_TYPE} is not supported.`);
      return false;
    }

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
      console.log("Recorder: Screen stream obtained. Video tracks:", screenStream.getVideoTracks().length, "Audio tracks:", screenStream.getAudioTracks().length);
      screenStream.addEventListener('ended', () => {
        console.log("Recorder: Screen sharing ended by user or system.");
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
        console.log("Recorder: Microphone stream obtained. Audio tracks:", micStream.getAudioTracks().length);
      } catch (micErr) {
        console.error("Recorder: Error getting microphone stream:", micErr);
        showError("Mikrofon ruxsatnomasi berilmadi. Yozib olish uchun mikrofon kerak.");
        stopAllStreams();
        return false;
      }

      // Combine audio tracks: system audio + microphone audio
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      screenStream.getAudioTracks().forEach(track => {
        console.log("Recorder: Adding screen audio track to destination:", track.id);
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
      });

      micStream.getAudioTracks().forEach(track => {
        console.log("Recorder: Adding mic audio track to destination:", track.id);
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
      });

      // Create a new stream with screen video and combined audio (NO WEBCAM VIDEO IN RECORDING)
      const combinedStream = new MediaStream();
      screenStream.getVideoTracks().forEach(track => {
        console.log("Recorder: Adding screen video track to combined stream:", track.id, "ReadyState:", track.readyState);
        combinedStream.addTrack(track);
      });
      destination.stream.getAudioTracks().forEach(track => {
        console.log("Recorder: Adding combined audio track to combined stream:", track.id, "ReadyState:", track.readyState);
        combinedStream.addTrack(track);
      });

      console.log("Recorder: Combined stream tracks before MediaRecorder init:", combinedStream.getTracks().map(t => ({ id: t.id, kind: t.kind, readyState: t.readyState, enabled: t.enabled })));

      if (combinedStream.getTracks().length === 0) {
        showError("Yozib olish uchun hech qanday stream topilmadi. Iltimos, ekran va mikrofon ruxsatnomalarini tekshiring.");
        stopAllStreams();
        return false;
      }
      console.log("Recorder: Combined stream tracks count:", combinedStream.getTracks().length);

      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: MIME_TYPE,
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log("Recorder: Data available, size:", event.data.size, "bytes. Total chunks:", recordedChunksRef.current.length, "MediaRecorder state:", mediaRecorderRef.current?.state);
        } else {
          console.warn("Recorder: ondataavailable event fired with no data or zero size data. MediaRecorder state:", mediaRecorderRef.current?.state);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log("Recorder: MediaRecorder onstop event triggered. Recorded chunks count:", recordedChunksRef.current.length, "MediaRecorder state:", mediaRecorderRef.current?.state);
        clearRecordingTimeout(); // Clear auto-stop timeout
        if (recordedChunksRef.current.length === 0) {
          showError("Yozib olishda hech qanday ma'lumot yig'ilmadi. Iltimos, qayta urinib ko'ring.");
          console.error("Recorder: No data collected during recording.");
          stopAllStreams(); // Ensure all streams are stopped even if no data
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: MIME_TYPE });
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
        console.log("Recorder: Recording successfully processed and saved.");
      };

      mediaRecorderRef.current.onerror = (event: Event) => {
        console.error("Recorder: MediaRecorder error:", event);
        showError("Yozib olishda xatolik yuz berdi: " + ((event as any).error?.message || "Noma'lum xato"));
        stopAllStreams();
      };

      console.log("Recorder: MediaRecorder state before start:", mediaRecorderRef.current.state);
      mediaRecorderRef.current.start(1000); // Add timeslice to ensure data is collected regularly
      startTimeRef.current = Date.now();
      setIsRecording(true);
      showSuccess("Recording started!");
      console.log("Recorder: Recording successfully started. MediaRecorder state after start:", mediaRecorderRef.current.state);

      // Set timeout to automatically stop recording after MAX_RECORDING_DURATION_MS
      recordingTimeoutRef.current = setTimeout(() => {
        console.log("Recorder: Auto-stopping recording after 20 minutes.");
        stopRecording();
        showSuccess("Yozib olish 20 daqiqadan so'ng avtomatik to'xtatildi.");
      }, MAX_RECORDING_DURATION_MS);

      return true;
    } catch (err) {
      console.error("Recorder: General error starting recording:", err);
      showError("Yozib olishni boshlashda kutilmagan xatolik yuz berdi. Ruxsatnomalarni tekshiring.");
      setIsRecording(false);
      stopAllStreams();
      return false;
    }
  }, [stopAllStreams, stopRecording, clearRecordingTimeout]);

  const resetRecordedData = useCallback(() => {
    setRecordedData(null);
    sessionStorage.removeItem("lastRecording");
    console.log("Recorder: Recorded data reset.");
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log("Recorder: Component unmounting, performing cleanup.");
      clearRecordingTimeout();

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        console.log("Recorder: Stopping MediaRecorder during unmount cleanup.");
        mediaRecorderRef.current.stop();
      }

      // Stop webcam stream if it's still active (it might have been stopped by stopAllStreams already)
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        console.log("Recorder: Webcam preview stream stopped during unmount cleanup.");
      }

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        console.log("Recorder: Screen stream stopped during unmount cleanup.");
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        console.log("Recorder: Microphone stream stopped during unmount cleanup.");
      }
      console.log("Recorder: All streams and timeouts cleared on unmount.");
    };
  }, [clearRecordingTimeout]); // webcamStream removed from dependencies to prevent premature cleanup
  // The webcamStream cleanup is now handled directly within the return function,
  // and its state is managed by setWebcamStream(null) in stopAllStreams.

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
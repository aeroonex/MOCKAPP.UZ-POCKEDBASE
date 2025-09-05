"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { StudentInfo, RecordedSession } from "@/lib/types";

interface RecordingData extends RecordedSession {
  blob: Blob | null;
}

const MAX_RECORDING_DURATION_MS = 60 * 60 * 1000; // 60 minutes in milliseconds
const MIME_TYPE = "video/webm; codecs=vp8,opus"; // Using a common WebM codec
const RECORDINGS_STORAGE_KEY = "allMockTestRecordings"; // New storage key for all recordings

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

  // Function to stop the MediaRecorder specifically and its associated streams (screen, mic)
  const stopRecordingProcess = useCallback(() => {
    console.log("Recorder: Stopping recording process (MediaRecorder, screen, mic streams)...");
    clearRecordingTimeout(); // Clear auto-stop timeout

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      console.log("Recorder: Stopping MediaRecorder. Current state:", mediaRecorderRef.current.state);
      mediaRecorderRef.current.stop(); // This will trigger onstop
    }

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

    setIsRecording(false);
    console.log("Recorder: Recording process streams stopped.");
  }, [clearRecordingTimeout]);

  // Function to stop ALL streams, including webcam preview.
  // This should only be called on full reset or component unmount.
  const stopAllStreams = useCallback(() => {
    console.log("Recorder: Stopping ALL streams (including webcam preview)...");
    stopRecordingProcess(); // Stop recording-related streams first

    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      console.log("Recorder: Webcam preview stream stopped.");
    }
    setWebcamStream(null); // Clear state

    console.log("Recorder: All streams stopped.");
  }, [webcamStream, stopRecordingProcess]);

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
      // This cleanup should only run on actual unmount of the component
      // and should stop the webcamStream if it's still active.
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        setWebcamStream(null);
        console.log("Recorder: Webcam preview stream cleaned up on unmount.");
      }
    };
  }, []); // Run only once on mount

  const startRecording = useCallback(async (studentInfo?: StudentInfo): Promise<boolean> => {
    console.log("Recorder: Attempting to start recording...");
    recordedChunksRef.current = []; // Clear previous chunks

    // Check for MediaRecorder support
    if (!MediaRecorder.isTypeSupported(MIME_TYPE)) {
      showError(`Yozib olish formati (${MIME_TYPE}) brauzeringiz tomonidan qo'llab-quvvatlanmaydi.`);
      console.error(`Recorder: MIME type ${MIME_TYPE} is not supported.`);
      stopRecordingProcess(); // Use the new function
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
        stopRecordingProcess(); // Use the new function
        return false;
      }
      screenStreamRef.current = screenStream;
      console.log("Recorder: Screen stream obtained. Video tracks:", screenStream.getVideoTracks().length, "Audio tracks:", screenStream.getAudioTracks().length);
      screenStream.addEventListener('ended', () => {
        console.log("Recorder: Screen sharing ended by user or system.");
        showError("Ekran ulashish to'xtatildi. Yozib olish tugatildi.");
        stopRecordingProcess(); // Use the new function
      });
      

      // 2. Get microphone audio
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!micStream || micStream.getAudioTracks().length === 0) {
          showError("Mikrofon ruxsatnomasi berilmadi yoki audio stream olinmadi.");
          stopRecordingProcess(); // Use the new function
          return false;
        }
        micStreamRef.current = micStream;
        console.log("Recorder: Microphone stream obtained. Audio tracks:", micStream.getAudioTracks().length);
      } catch (micErr) {
        console.error("Recorder: Error getting microphone stream:", micErr);
        showError("Mikrofon ruxsatnomasi berilmadi. Yozib olish uchun mikrofon kerak.");
        stopRecordingProcess(); // Use the new function
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
        stopRecordingProcess(); // Use the new function
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
          stopRecordingProcess(); // Use the new function
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: MIME_TYPE });
        const url = URL.createObjectURL(blob);
        const endTime = Date.now();
        const duration = Math.round((endTime - startTimeRef.current) / 1000);

        const newRecording: RecordedSession = { // Use RecordedSession type
          url,
          timestamp: new Date().toISOString(),
          duration,
          studentInfo,
        };
        
        // Save all recordings to localStorage
        const existingRecordings = JSON.parse(localStorage.getItem(RECORDINGS_STORAGE_KEY) || "[]") as RecordedSession[];
        localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify([newRecording, ...existingRecordings]));

        setRecordedData({ ...newRecording, blob }); // Update state with the latest recording
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
        stopRecordingProcess(); // Use the new function
      };

      console.log("Recorder: MediaRecorder state before start:", mediaRecorderRef.current.state);
      mediaRecorderRef.current.start(1000); // Add timeslice to ensure data is collected regularly
      startTimeRef.current = Date.now();
      setIsRecording(true);
      showSuccess("Recording started!");
      console.log("Recorder: Recording successfully started. MediaRecorder state after start:", mediaRecorderRef.current.state);

      // Set timeout to automatically stop recording after MAX_RECORDING_DURATION_MS
      console.log(`Recorder: Setting auto-stop timeout for ${MAX_RECORDING_DURATION_MS / 1000 / 60} minutes.`);
      recordingTimeoutRef.current = setTimeout(() => {
        console.log("Recorder: Auto-stopping recording after max duration.");
        stopRecordingProcess(); // Use the new function
        showSuccess("Yozib olish maksimal vaqtga yetgani uchun avtomatik to'xtatildi.");
      }, MAX_RECORDING_DURATION_MS);

      return true;
    } catch (err) {
      console.error("Recorder: General error starting recording:", err);
      showError("Yozib olishni boshlashda kutilmagan xatolik yuz berdi. Ruxsatnomalarni tekshiring.");
      setIsRecording(false);
      stopRecordingProcess(); // Use the new function
      return false;
    }
  }, [stopRecordingProcess, clearRecordingTimeout]);

  const resetRecordedData = useCallback(() => {
    setRecordedData(null);
    // We no longer clear sessionStorage for "lastRecording" as we're using localStorage for all recordings
    console.log("Recorder: Recorded data state reset.");
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
        setWebcamStream(null);
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
  }, [clearRecordingTimeout]);

  return {
    isRecording,
    startRecording,
    stopRecording: stopRecordingProcess, // Expose the recording-specific stop
    stopAllStreams, // Expose the full cleanup
    recordedData,
    webcamStream, // Return the unified webcam stream for display
    resetRecordedData,
  };
};
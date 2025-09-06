"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { StudentInfo, RecordedSession } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

const MAX_RECORDING_DURATION_MS = 60 * 60 * 1000;
const MIME_TYPE = "video/webm; codecs=vp8,opus";

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRecordingTimeout = useCallback(() => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  }, []);

  const stopRecordingProcess = useCallback(() => {
    clearRecordingTimeout();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
    micStreamRef.current = null;
    setIsRecording(false);
  }, [clearRecordingTimeout]);

  const stopAllStreams = useCallback(() => {
    stopRecordingProcess();
    webcamStream?.getTracks().forEach(track => track.stop());
    setWebcamStream(null);
  }, [webcamStream, stopRecordingProcess]);

  useEffect(() => {
    const getWebcamPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setWebcamStream(stream);
      } catch (err) {
        showError("Kamera tasvirini olishda xatolik yuz berdi.");
      }
    };
    getWebcamPreview();
    return () => {
      webcamStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const startRecording = useCallback(async (studentInfo?: StudentInfo): Promise<boolean> => {
    recordedChunksRef.current = [];
    if (!MediaRecorder.isTypeSupported(MIME_TYPE)) {
      showError(`Yozib olish formati (${MIME_TYPE}) qo'llab-quvvatlanmaydi.`);
      return false;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = screenStream;
      screenStream.addEventListener('ended', () => {
        showError("Ekran ulashish to'xtatildi. Yozib olish tugatildi.");
        stopRecordingProcess();
      });

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      if (screenStream.getAudioTracks().length > 0) {
        audioContext.createMediaStreamSource(new MediaStream([screenStream.getAudioTracks()[0]])).connect(destination);
      }
      if (micStream.getAudioTracks().length > 0) {
        audioContext.createMediaStreamSource(new MediaStream([micStream.getAudioTracks()[0]])).connect(destination);
      }

      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      mediaRecorderRef.current = new MediaRecorder(combinedStream, { mimeType: MIME_TYPE });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        clearRecordingTimeout();
        if (recordedChunksRef.current.length === 0) {
          showError("Yozib olishda hech qanday ma'lumot yig'ilmadi.");
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: MIME_TYPE });
        const endTime = Date.now();
        const duration = Math.round((endTime - startTimeRef.current) / 1000);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          showError("Yozuvni saqlash uchun tizimga kiring.");
          return;
        }

        const filePath = `${user.id}/${uuidv4()}.webm`;
        showSuccess("Video yuklanmoqda, iltimos kuting...");

        const { error: uploadError } = await supabase.storage
          .from('recordings')
          .upload(filePath, blob);

        if (uploadError) {
          showError(`Videoni yuklashda xatolik: ${uploadError.message}`);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('recordings')
          .getPublicUrl(filePath);

        const newRecording = {
          user_id: user.id,
          duration,
          student_id: studentInfo?.id,
          student_name: studentInfo?.name,
          student_phone: studentInfo?.phone,
          video_url: publicUrlData.publicUrl,
        };

        const { error: dbError } = await supabase.from('recordings').insert([newRecording]);

        if (dbError) {
          showError(`Yozuv ma'lumotlarini saqlashda xatolik: ${dbError.message}`);
        } else {
          showSuccess("Yozib olingan video muvaffaqiyatli saqlandi!");
        }

        recordedChunksRef.current = [];
        setIsRecording(false);
        stopRecordingProcess();
      };

      mediaRecorderRef.current.onerror = (event: Event) => {
        showError("Yozib olishda xatolik yuz berdi: " + ((event as any).error?.message || "Noma'lum xato"));
        stopRecordingProcess();
      };

      mediaRecorderRef.current.start(1000);
      startTimeRef.current = Date.now();
      setIsRecording(true);
      showSuccess("Yozib olish boshlandi!");

      recordingTimeoutRef.current = setTimeout(() => {
        stopRecordingProcess();
        showSuccess("Yozib olish maksimal vaqtga yetgani uchun to'xtatildi.");
      }, MAX_RECORDING_DURATION_MS);

      return true;
    } catch (err) {
      showError("Yozib olishni boshlashda xatolik yuz berdi. Ruxsatnomalarni tekshiring.");
      setIsRecording(false);
      stopRecordingProcess();
      return false;
    }
  }, [stopRecordingProcess, clearRecordingTimeout]);

  useEffect(() => {
    return () => {
      clearRecordingTimeout();
      if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
      stopAllStreams();
    };
  }, [clearRecordingTimeout, stopAllStreams]);

  return { isRecording, startRecording, stopRecording: stopRecordingProcess, stopAllStreams, webcamStream };
};
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { StudentInfo } from "@/lib/types";
import { addLocalRecording, updateLocalRecordingSupabaseUrl, upsertRecordingMetadataToSupabase } from "@/lib/local-db";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { v4 as uuidv4 } from 'uuid';
import { setUploadProgress, removeUploadProgress } from "@/utils/uploadProgress";

const MAX_RECORDING_DURATION_MS = 60 * 60 * 1000;
const MIME_TYPE = "video/webm; codecs=vp8,opus";

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation();
  const { user } = useAuth();

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
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }
    setWebcamStream(null);
  }, [stopRecordingProcess]);

  useEffect(() => {
    const getWebcamPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        webcamStreamRef.current = stream;
        setWebcamStream(stream);
      } catch (err) {
        showError(t("add_question_page.error_webcam_stream"));
      }
    };
    getWebcamPreview();
  }, [t]);

  const startRecording = useCallback(async (studentInfo?: StudentInfo): Promise<boolean> => {
    recordedChunksRef.current = [];
    if (!MediaRecorder.isTypeSupported(MIME_TYPE)) {
      showError(t("add_question_page.error_recording_format_not_supported", { mimeType: MIME_TYPE }));
      return false;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = screenStream;
      screenStream.addEventListener('ended', () => {
        showError(t("add_question_page.error_screen_sharing_stopped"));
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
          showError(t("add_question_page.error_no_data_recorded"));
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: MIME_TYPE });
        const endTime = Date.now();
        const duration = Math.round((endTime - startTimeRef.current) / 1000);

        showSuccess(t("add_question_page.success_video_saving"));

        try {
          const currentTimestamp = new Date().toISOString();
          const userId = user?.id || 'local_user';

          // 1. Avval mahalliy (IndexedDB) saqlaymiz
          const recordingId = await addLocalRecording({
            duration,
            student_id: studentInfo?.id,
            student_name: studentInfo?.name,
            student_phone: studentInfo?.phone,
            videoBlob: blob,
            timestamp: currentTimestamp, // add timestamp here
            user_id: userId, // add user_id here
          });
          showSuccess(t("add_question_page.success_video_saved"));

          // 2. Agar foydalanuvchi tizimga kirgan bo'lsa, Supabase Storage'ga yuklaymiz
          if (user?.id) {
            const filePath = `${user.id}/${recordingId}.webm`;
            setUploadProgress(recordingId, 0);
            const { data, error: uploadError } = await supabase.storage
              .from('recordings')
              .upload(filePath, blob, {
                cacheControl: '3600',
                upsert: false,
              }, (event) => {
                console.log(`Upload progress for recording ID ${recordingId}: ${event.percent}%`); // Debug log
                setUploadProgress(recordingId, event.percent || 0);
              });

            if (uploadError) {
              showError(`${t("records_page.error_uploading_to_cloud")} ${uploadError.message}`);
              setUploadProgress(recordingId, -1);
            } else {
              const { data: publicUrlData } = supabase.storage
                .from('recordings')
                .getPublicUrl(filePath);
              
              if (publicUrlData.publicUrl) {
                // 3. Mahalliy yozuvni Supabase URL bilan yangilaymiz
                await updateLocalRecordingSupabaseUrl(recordingId, publicUrlData.publicUrl);
                
                // 4. Supabase metadata jadvaliga ma'lumotlarni kiritamiz/yangilaymiz
                await upsertRecordingMetadataToSupabase({
                  id: recordingId,
                  user_id: userId,
                  timestamp: currentTimestamp,
                  duration,
                  student_id: studentInfo?.id,
                  student_name: studentInfo?.name,
                  student_phone: studentInfo?.phone,
                  supabase_url: publicUrlData.publicUrl,
                });

                showSuccess(t("records_page.success_uploaded_to_cloud"));
                setUploadProgress(recordingId, 100);
                setTimeout(() => removeUploadProgress(recordingId), 2000); // Yuklash tugagach progressni o'chiramiz
              } else {
                showError(t("records_page.error_getting_public_url"));
                setUploadProgress(recordingId, -1);
              }
            }
          }

        } catch (dbError: any) {
          showError(`${t("add_question_page.error_saving_record_data")} ${dbError.message}`);
        }

        recordedChunksRef.current = [];
        setIsRecording(false);
        stopRecordingProcess();
      };

      mediaRecorderRef.current.onerror = (event: Event) => {
        showError(`${t("add_question_page.error_recording_failed")} ${((event as any).error?.message || "Noma'lum xato")}`);
        stopRecordingProcess();
      };

      mediaRecorderRef.current.start(1000);
      startTimeRef.current = Date.now();
      setIsRecording(true);
      showSuccess(t("add_question_page.success_recording_started"));

      recordingTimeoutRef.current = setTimeout(() => {
        stopRecordingProcess();
        showSuccess(t("add_question_page.success_recording_max_time"));
      }, MAX_RECORDING_DURATION_MS);

      return true;
    } catch (err) {
      showError(t("add_question_page.error_recording_failed"));
      setIsRecording(false);
      stopRecordingProcess();
      return false;
    }
  }, [stopRecordingProcess, clearRecordingTimeout, t, user]);

  useEffect(() => {
    return () => {
      clearRecordingTimeout();
      if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
      stopAllStreams();
    };
  }, [clearRecordingTimeout, stopAllStreams]);

  return { isRecording, startRecording, stopRecording: stopRecordingProcess, stopAllStreams, webcamStream };
};
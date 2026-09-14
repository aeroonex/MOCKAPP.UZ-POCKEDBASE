"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { StudentInfo } from "@/lib/types";
import { addLocalRecording, autoUploadRecording, updateLocalRecordingCloudUrl } from "@/lib/local-db";
import { api, auth } from "@/lib/api";
import { ExamCompositor, type OverlayState } from "@/lib/exam-compositor";
import { ChunkUploader } from "@/lib/chunk-uploader";
import { recorderState } from "@/lib/recorder-state";
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import i18n from "@/i18n";

const MAX_RECORDING_DURATION_MS = 60 * 60 * 1000;
/** Bo'lak uzunligi: har 5 soniyada serverga ketadi */
const TIMESLICE_MS = 5000;
/** 960×540 @ 15 fps: 10 daqiqa ≈ 40 MB (Telegram zaxirasi 50 MB limitiga sig'adi) */
const VIDEO_BPS = 550_000;
const AUDIO_BPS = 64_000;

/** Brauzer qo'llab-quvvatlaydigan eng yaxshi konteyner/kodek. */
function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

const isMobileDevice = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

/**
 * Yozib olish: kamera + savol + taymer bitta canvas'ga chiziladi (ekran ulashishsiz),
 * mikrofon bilan birga MediaRecorder'ga beriladi. Bo'laklar test davomida serverga oqim bilan ketadi.
 */
export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [isRecordingSupported, setIsRecordingSupported] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const compositorRef = useRef<ExamCompositor | null>(null);
  const uploaderRef = useRef<ChunkUploader | null>(null);
  const overlayRef = useRef<OverlayState | null>(null);
  const startTimeRef = useRef<number>(0);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation();

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
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    micStreamRef.current = null;
    compositorRef.current?.stop();
    compositorRef.current = null;
    recorderState.isRecording = false;
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
    const canvasOk = typeof HTMLCanvasElement !== "undefined" && "captureStream" in HTMLCanvasElement.prototype;
    setIsRecordingSupported(
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && canvasOk && !!pickMimeType() && !isMobileDevice(),
    );

    const getWebcamPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 15, max: 30 }, facingMode: "user" },
          audio: false,
        });
        webcamStreamRef.current = stream;
        setWebcamStream(stream);
      } catch (err) {
        console.warn("Webcam stream error:", err);
        // Kamera bo'lmasa ham test o'tkaziladi (videoda "Kamera yo'q" belgisi bo'ladi)
      }
    };
    getWebcamPreview();

    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /** Test holati o'zgarganda chaqiriladi — videoga chiziladigan savol/taymer/qism. */
  const updateOverlay = useCallback((state: OverlayState) => {
    overlayRef.current = state;
    compositorRef.current?.setState(state);
  }, []);

  const startRecording = useCallback(async (studentInfo?: StudentInfo): Promise<boolean> => {
    if (!isRecordingSupported) {
      showError(t("add_question_page.error_recording_not_supported_mobile"));
      return false;
    }
    const mimeType = pickMimeType();
    if (!mimeType) {
      showError(t("add_question_page.error_recording_format_not_supported", { mimeType: "webm/mp4" }));
      return false;
    }

    recordedChunksRef.current = [];
    const localId = uuidv4();
    const startedIso = new Date().toISOString();

    try {
      // Mikrofon (kamera allaqachon ochiq; bo'lmasa kamerasiz davom etadi)
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = micStream;
      micStream.getAudioTracks()[0]?.addEventListener("ended", () => {
        showError(t("add_question_page.error_mic_stopped"));
      });

      // Kompozit sahna: kamera + savol + taymer
      const compositor = new ExamCompositor({ width: 960, height: 540, fps: 15 });
      compositor.attachCamera(webcamStreamRef.current, t("mock_test_page.no_camera"));
      if (overlayRef.current) compositor.setState({ ...overlayRef.current, student: studentInfo ?? overlayRef.current.student });
      compositorRef.current = compositor;
      const canvasStream = compositor.start();

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...micStream.getAudioTracks(),
      ]);

      // Oqim bilan yuklash: tizimga kirgan har qanday hisobda — ro'yxatdagi ham, qo'lda kiritilgan o'quvchi ham
      // (server yuklangan har bir videoni Telegram'ga zaxiralaydi). Mehmon rejimida faqat lokal nusxa.
      const streamToCloud = ChunkUploader.available();
      const uploader = streamToCloud ? new ChunkUploader(localId) : null;
      uploaderRef.current = uploader;

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: VIDEO_BPS,
        audioBitsPerSecond: AUDIO_BPS,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          uploader?.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearRecordingTimeout();
        if (recordedChunksRef.current.length === 0) {
          showError(t("add_question_page.error_no_data_recorded"));
          uploader?.abort();
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: mimeType.split(";")[0] });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);

        showSuccess(t("add_question_page.success_video_saving"));

        let recordingId: string | null = null;
        try {
          recordingId = await addLocalRecording({
            id: localId,
            timestamp: startedIso,
            duration,
            student_id: studentInfo?.id,
            student_name: studentInfo?.name,
            student_phone: studentInfo?.phone,
            registration_id: studentInfo?.registration_id,
            attempt: studentInfo?.attempt,
            videoBlob: blob,
          });
          showSuccess(t("add_question_page.success_video_saved"));
        } catch (dbError: any) {
          showError(`${t("add_question_page.error_saving_record_data")} ${dbError.message}`);
        }

        // Serverga: avval oqim bilan kelgan bo'laklarni yakunlash; bo'lmasa — to'liq faylni yuklash
        if (uploader && auth.model) {
          void finalizeStreamedUpload(uploader, {
            timestamp: startedIso,
            duration,
            student_id: studentInfo?.id,
            student_name: studentInfo?.name,
            student_phone: studentInfo?.phone,
            registration_id: studentInfo?.registration_id,
            attempt: studentInfo?.attempt,
            mime: mimeType.split(";")[0],
          }, recordingId);
        }

        recordedChunksRef.current = [];
        setIsRecording(false);
        stopRecordingProcess();
      };

      recorder.onerror = (event: Event) => {
        showError(`${t("add_question_page.error_recording_failed")} ${((event as any).error?.message || "Noma'lum xato")}`);
        stopRecordingProcess();
      };

      recorder.start(TIMESLICE_MS);
      startTimeRef.current = Date.now();
      recorderState.isRecording = true;
      setIsRecording(true);
      showSuccess(t("add_question_page.success_recording_started"));

      recordingTimeoutRef.current = setTimeout(() => {
        stopRecordingProcess();
        showSuccess(t("add_question_page.success_recording_max_time"));
      }, MAX_RECORDING_DURATION_MS);

      return true;
    } catch (err) {
      console.error("Error during recording setup:", err);
      showError(t("add_question_page.error_recording_failed"));
      setIsRecording(false);
      stopRecordingProcess();
      return false;
    }
  }, [isRecordingSupported, stopRecordingProcess, clearRecordingTimeout, t]);

  useEffect(() => {
    return () => {
      clearRecordingTimeout();
      if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
      stopAllStreams();
    };
  }, [clearRecordingTimeout, stopAllStreams]);

  return { isRecording, startRecording, stopRecording: stopRecordingProcess, stopAllStreams, webcamStream, isRecordingSupported, updateOverlay };
};

/**
 * Oqim bilan yuborilgan bo'laklarni serverda yakunlaydi (toast bilan). Bo'laklar yetib bormagan
 * bo'lsa — lokal nusxadan to'liq faylni yuklaydi (eski, ishonchli yo'l).
 */
async function finalizeStreamedUpload(uploader: ChunkUploader, meta: Parameters<ChunkUploader["finalize"]>[0], recordingId: string | null) {
  const { toast } = await import("sonner");
  const { setProgress, removeProgress } = await import("@/utils/uploadProgress");
  const toastId = toast.loading(i18n.t("records_page.auto_upload_started"));
  if (recordingId) setProgress(recordingId, 0);
  uploader.onProgress = (sent, total) => {
    const pct = total ? Math.round((sent / total) * 100) : 0;
    if (recordingId) setProgress(recordingId, pct);
    toast.loading(i18n.t("records_page.auto_upload_progress", { percent: pct }), { id: toastId });
  };
  try {
    const drained = await uploader.drain(90_000);
    if (!drained) throw new Error("chunks-missing");
    const rec = await uploader.finalize(meta);
    const url = rec?.video_url ? api.fileUrl(rec.video_url) : "";
    if (recordingId && url) await updateLocalRecordingCloudUrl(recordingId, url);
    if (recordingId) setProgress(recordingId, 100);
    toast.success(i18n.t("records_page.auto_upload_done"), { id: toastId, duration: 6000 });
  } catch (e: any) {
    uploader.abort();
    toast.dismiss(toastId);
    if (recordingId) {
      // Zaxira yo'li: to'liq faylni bir martada yuklash
      await autoUploadRecording(recordingId);
    } else {
      toast.error(i18n.t("records_page.auto_upload_failed", { message: e?.message || String(e) }), { duration: 8000 });
    }
  } finally {
    if (recordingId) removeProgress(recordingId);
  }
}

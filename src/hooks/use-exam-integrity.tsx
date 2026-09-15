"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logIntegrityEvent, recorderState } from "@/lib/recorder-state";

/**
 * Halollik nazorati (test davomida):
 *  - oynadan chiqish (Alt+Tab, boshqa tab) — blur/visibility
 *  - to'liq ekrandan chiqish — fullscreenchange
 *  - yuz kadrda yo'qligi / bir nechta yuz — MediaPipe BlazeFace (brauzerda, ~1.5 kadr/s)
 * Hodisalar vaqt bilan yozuvga qo'shiladi; UI holati ogohlantirishlar uchun qaytariladi.
 */

export interface IntegrityStatus {
  /** oynadan chiqilgan (hozir) */
  away: boolean;
  /** oynadan chiqishlar soni */
  awayCount: number;
  /** to'liq ekrandan chiqilgan (hozir) */
  fullscreenLost: boolean;
  fullscreenExits: number;
  /** yuz kadrda yo'q (hozir, 6 s dan beri) */
  faceMissing: boolean;
  /** kadrda bir nechta yuz (hozir) */
  multipleFaces: boolean;
  /** yuz aniqlash modeli ishlayaptimi */
  faceDetectorReady: boolean;
  /** so'nggi "oynadan chiqildi" ogohlantirishi vaqti (qaytgach bir necha soniya ko'rsatiladi) */
  awayAlertAt: number | null;
}

const FACE_MISSING_AFTER_MS = 6000;
const MULTI_FACE_AFTER_MS = 3000;
/**
 * Oynadan chiqish qancha davom etsa hodisa deb yozamiz. 2 sekund — kamera/mikrofon
 * ruxsati so'rovi, brauzer menyusi yoki qisqa fokus yo'qolishi soxta ogohlantirish
 * bermasligi uchun (ilgari 0.8 s edi va o'quvchiga keraksiz qizil banner chiqardi).
 */
const BLUR_MIN_MS = 2000;
const DETECT_INTERVAL_MS = 700;

const initial: IntegrityStatus = {
  away: false,
  awayCount: 0,
  fullscreenLost: false,
  fullscreenExits: 0,
  faceMissing: false,
  multipleFaces: false,
  faceDetectorReady: false,
  awayAlertAt: null,
};

export function useExamIntegrity(active: boolean, webcamStream: MediaStream | null) {
  const [status, setStatus] = useState<IntegrityStatus>(initial);
  const patch = useCallback((p: Partial<IntegrityStatus>) => setStatus((s) => ({ ...s, ...p })), []);

  // Oyna / to'liq ekran
  useEffect(() => {
    if (!active) {
      setStatus(initial);
      return;
    }
    let blurAt = 0;
    let blurTimer: number | null = null;

    const onAway = () => {
      if (blurAt) return;
      blurAt = Date.now();
      blurTimer = window.setTimeout(() => {
        // Vaqt o'tib ham sahifa fokusda bo'lmasa — haqiqatan chiqilgan
        if (document.hasFocus() && document.visibilityState === "visible") {
          blurAt = 0;
          return;
        }
        logIntegrityEvent("window_blur");
        setStatus((s) => ({ ...s, away: true, awayCount: s.awayCount + 1 }));
      }, BLUR_MIN_MS);
    };
    const onBack = () => {
      if (!blurAt) return;
      const dur = Date.now() - blurAt;
      blurAt = 0;
      if (blurTimer) clearTimeout(blurTimer);
      if (dur >= BLUR_MIN_MS) {
        logIntegrityEvent("window_focus", `${(dur / 1000).toFixed(1)}s`);
        setStatus((s) => ({ ...s, away: false, awayAlertAt: Date.now() }));
      }
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? onAway() : onBack());
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        logIntegrityEvent("fullscreen_exit");
        setStatus((s) => ({ ...s, fullscreenLost: true, fullscreenExits: s.fullscreenExits + 1 }));
      } else {
        logIntegrityEvent("fullscreen_enter");
        patch({ fullscreenLost: false });
      }
    };

    window.addEventListener("blur", onAway);
    window.addEventListener("focus", onBack);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.removeEventListener("blur", onAway);
      window.removeEventListener("focus", onBack);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      if (blurTimer) clearTimeout(blurTimer);
    };
  }, [active, patch]);

  // Yuz aniqlash
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (!active || !webcamStream) return;
    let cancelled = false;
    let timer: number | null = null;
    let detector: { detectForVideo: (v: HTMLVideoElement, ts: number) => { detections: unknown[] }; close: () => void } | null = null;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = webcamStream;
    video.play().catch(() => undefined);
    videoRef.current = video;

    let noFaceSince: number | null = null;
    let missingLogged = false;
    let multiSince: number | null = null;
    let multiLogged = false;

    (async () => {
      try {
        const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks("/models/wasm");
        const fd = await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "/models/blaze_face_short_range.tflite", delegate: "CPU" },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
        });
        if (cancelled) {
          fd.close();
          return;
        }
        detector = fd;
        patch({ faceDetectorReady: true });

        const tick = () => {
          if (cancelled || !detector) return;
          try {
            if (video.readyState >= 2 && video.videoWidth > 0) {
              const n = detector.detectForVideo(video, performance.now()).detections.length;
              const now = Date.now();
              // yuz yo'q
              if (n === 0) {
                if (noFaceSince === null) noFaceSince = now;
                else if (!missingLogged && now - noFaceSince >= FACE_MISSING_AFTER_MS) {
                  missingLogged = true;
                  logIntegrityEvent("face_missing");
                  patch({ faceMissing: true });
                }
              } else {
                if (missingLogged) {
                  logIntegrityEvent("face_back", `${Math.round((now - (noFaceSince ?? now)) / 1000)}s`);
                  patch({ faceMissing: false });
                }
                noFaceSince = null;
                missingLogged = false;
              }
              // bir nechta yuz
              if (n >= 2) {
                if (multiSince === null) multiSince = now;
                else if (!multiLogged && now - multiSince >= MULTI_FACE_AFTER_MS) {
                  multiLogged = true;
                  logIntegrityEvent("faces_multiple", String(n));
                  patch({ multipleFaces: true });
                }
              } else {
                if (multiLogged) patch({ multipleFaces: false });
                multiSince = null;
                multiLogged = false;
              }
            }
          } catch (e) {
            console.warn("face detect:", e);
          }
          timer = window.setTimeout(tick, DETECT_INTERVAL_MS);
        };
        tick();
      } catch (e) {
        console.warn("Yuz aniqlash modeli yuklanmadi (nazorat yuzsiz davom etadi):", e);
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      try {
        detector?.close();
      } catch {
        /* e'tiborsiz */
      }
      video.srcObject = null;
      videoRef.current = null;
      patch({ faceDetectorReady: false, faceMissing: false, multipleFaces: false });
    };
  }, [active, webcamStream, patch]);

  const requestFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen().catch(() => undefined);
  }, []);

  const eventCount = recorderState.integrityEvents.filter((e) => e.type !== "window_focus" && e.type !== "fullscreen_enter" && e.type !== "face_back").length;

  return { status, requestFullscreen, eventCount };
}

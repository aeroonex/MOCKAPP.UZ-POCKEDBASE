"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Camera, CheckCircle2, Loader2, Mic, RefreshCw, Wifi, XCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DeviceCheckProps {
  /** useRecorder ochgan kamera oqimi (null — ruxsat yo'q yoki kamera topilmadi) */
  webcamStream: MediaStream | null;
}

type Status = "checking" | "ok" | "warn" | "fail";

/** Yuklash uchun yetarli tezlik (Mbit/s): video ~0.6 Mbit/s, zaxira bilan */
const MIN_UPLOAD_MBPS = 1.5;
const TEST_BYTES = 1.5 * 1024 * 1024;
/** Mikrofon "ishlayapti" deyish uchun kerakli daraja va davomiylik */
const MIC_LEVEL_THRESHOLD = 0.06;
const MIC_HOLD_MS = 300;

const StatusIcon: React.FC<{ status: Status }> = ({ status }) => {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />;
  if (status === "fail") return <XCircle className="h-4 w-4 shrink-0 text-red-500" />;
  return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />;
};

/** Yuklash tezligi va kechikishni o'lchaydi (avtorizatsiyasiz endpointlar). */
async function measureNetwork(): Promise<{ mbps: number; pingMs: number }> {
  const t0 = performance.now();
  const ping = await fetch(`${API_BASE_URL}/api/net/ping`, { cache: "no-store" });
  if (!ping.ok) throw new Error(`ping ${ping.status}`);
  const pingMs = Math.round(performance.now() - t0);

  // Tasodifiy ma'lumot (siqilmasin)
  const data = new Uint8Array(TEST_BYTES);
  for (let off = 0; off < data.length; off += 65536) {
    crypto.getRandomValues(data.subarray(off, Math.min(off + 65536, data.length)));
  }
  const t1 = performance.now();
  const res = await fetch(`${API_BASE_URL}/api/net/upload-test`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: data,
  });
  if (!res.ok) throw new Error(`upload-test ${res.status}`);
  const ms = Math.max(1, performance.now() - t1 - pingMs / 2);
  const mbps = (TEST_BYTES * 8) / (ms / 1000) / 1_000_000;
  return { mbps, pingMs };
}

/**
 * Test oldidan qurilma tekshiruvi: kamera ko'rinishi, mikrofon darajasi ("gapiring… ✓"), internet tezligi.
 * Faqat ma'lumot beradi — testni boshlashga to'sqinlik qilmaydi.
 */
const DeviceCheck: React.FC<DeviceCheckProps> = ({ webcamStream }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Kamera
  const [cameraStatus, setCameraStatus] = useState<Status>("checking");
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = webcamStream;
    if (webcamStream) {
      setCameraStatus("ok");
      return;
    }
    // Ruxsat so'rovi hali javob bermagan bo'lishi mumkin — biroz kutamiz
    const id = setTimeout(() => setCameraStatus("warn"), 4000);
    return () => clearTimeout(id);
  }, [webcamStream]);

  // Mikrofon
  const [micStatus, setMicStatus] = useState<Status>("checking");
  const [level, setLevel] = useState(0);
  const [micRun, setMicRun] = useState(0);
  // Brauzer foydalanuvchi bosmaguncha AudioContext'ni "suspended" qiladi — shunda daraja o'lchanmaydi
  const [needsGesture, setNeedsGesture] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const resumeAudio = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx && ctx.state !== "running") ctx.resume().catch(() => undefined);
  }, []);
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    let heardSince = 0;
    let detected = false;
    let lastPaint = 0;
    const onGesture = () => resumeAudio();

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        ctx = new AudioContext();
        ctxRef.current = ctx;
        const syncState = () => setNeedsGesture(ctx?.state !== "running");
        ctx.onstatechange = syncState;
        await ctx.resume().catch(() => undefined);
        syncState();
        // Bosish/klaviatura bo'lganda kontekstni uyg'otamiz (bir marta yetadi)
        window.addEventListener("pointerdown", onGesture, { capture: true });
        window.addEventListener("keydown", onGesture, { capture: true });
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        const tick = (now: number) => {
          if (cancelled) return;
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          if (rms > MIC_LEVEL_THRESHOLD) {
            if (!heardSince) heardSince = now;
            if (!detected && now - heardSince >= MIC_HOLD_MS) {
              detected = true;
              setMicStatus("ok");
            }
          } else {
            heardSince = 0;
          }
          if (now - lastPaint > 66) {
            lastPaint = now;
            setLevel(Math.min(1, rms * 4));
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setMicStatus("fail");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", onGesture, { capture: true });
      window.removeEventListener("keydown", onGesture, { capture: true });
      stream?.getTracks().forEach((tr) => tr.stop());
      ctxRef.current = null;
      ctx?.close().catch(() => undefined);
    };
  }, [micRun, resumeAudio]);

  // Internet
  const [netStatus, setNetStatus] = useState<Status>("checking");
  const [net, setNet] = useState<{ mbps: number; pingMs: number } | null>(null);
  const runNet = useCallback(async () => {
    setNetStatus("checking");
    setNet(null);
    if (!navigator.onLine) {
      setNetStatus("fail");
      return;
    }
    try {
      const r = await measureNetwork();
      setNet(r);
      setNetStatus(r.mbps >= MIN_UPLOAD_MBPS ? "ok" : "warn");
    } catch {
      setNetStatus("fail");
    }
  }, []);
  useEffect(() => {
    void runNet();
  }, [runNet]);

  const recheck = () => {
    setMicStatus("checking");
    setMicRun((n) => n + 1);
    void runNet();
  };

  const micText =
    micStatus === "ok"
      ? t("mock_test_page.mic_ok")
      : micStatus === "fail"
        ? t("mock_test_page.mic_missing")
        : needsGesture
          ? t("mock_test_page.mic_tap")
          : t("mock_test_page.mic_speak");
  const netText =
    netStatus === "checking"
      ? t("mock_test_page.net_testing")
      : netStatus === "fail"
        ? t("mock_test_page.net_offline")
        : netStatus === "warn"
          ? t("mock_test_page.net_slow", { mbps: net!.mbps.toFixed(1) })
          : t("mock_test_page.net_ok", { mbps: net!.mbps.toFixed(1), ping: net!.pingMs });
  const cameraText =
    cameraStatus === "ok" ? t("mock_test_page.camera_ok") : cameraStatus === "warn" ? t("mock_test_page.camera_missing") : t("mock_test_page.camera_waiting");

  const bars = 14;

  return (
    <section aria-labelledby="device-check">
      <div className="flex items-center justify-between">
        <h2 id="device-check" className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("mock_test_page.device_check_title")}
        </h2>
        <button
          type="button"
          onClick={recheck}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          {t("mock_test_page.recheck")}
        </button>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {/* Kamera */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
          <div className="relative h-14 w-[4.7rem] shrink-0 overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            {!webcamStream && (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                <Camera className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("mock_test_page.check_camera")}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground">
              <StatusIcon status={cameraStatus} />
              <span className="truncate">{cameraText}</span>
            </p>
          </div>
        </div>

        {/* Mikrofon */}
        <div className="cursor-pointer rounded-xl border border-border bg-background/60 p-3" onClick={resumeAudio}>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Mic className="h-3.5 w-3.5" />
            {t("mock_test_page.check_mic")}
          </p>
          <div className="mt-2 flex h-6 items-end gap-[3px]" aria-hidden="true">
            {Array.from({ length: bars }).map((_, i) => {
              const on = level * bars > i;
              return (
                <span
                  key={i}
                  className={cn("w-1.5 rounded-sm transition-colors duration-75", on ? (i > bars * 0.75 ? "bg-red-500" : "bg-emerald-500") : "bg-muted")}
                  style={{ height: `${30 + (i / bars) * 70}%` }}
                />
              );
            })}
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-foreground">
            <StatusIcon status={micStatus} />
            <span className="truncate">{micText}</span>
          </p>
        </div>

        {/* Internet */}
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Wifi className="h-3.5 w-3.5" />
            {t("mock_test_page.check_net")}
          </p>
          <p className="mt-2 text-2xl font-black leading-none tabular-nums text-foreground">
            {net ? net.mbps.toFixed(1) : "—"}
            <span className="ml-1 text-xs font-semibold text-muted-foreground">Mbit/s</span>
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-foreground">
            <StatusIcon status={netStatus} />
            <span className="truncate">{netText}</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default DeviceCheck;

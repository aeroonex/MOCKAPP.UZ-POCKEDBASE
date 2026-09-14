"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Mic, MicOff, VideoOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ICE_SERVERS, newCallId, openRtcStream, rtcSignal, rtcStop, rtcWatch, type RtcEvent } from "@/lib/rtc";

/** Kuzatiladigan foydalanuvchi (onlayn kartadan) */
export interface WatchTarget {
  userId: string;
  name: string;
}

type State = "connecting" | "waiting" | "live" | "offline" | "error";

/**
 * Admin tomoni: onlayn foydalanuvchining kamerasini JONLI ko'radi va eshitadi (bir tomonlama).
 * Media WebRTC bilan to'g'ridan-to'g'ri keladi; qotmaydi (sifat internetga qarab avtomatik moslanadi).
 */
const LiveViewer: React.FC<{ target: WatchTarget | null; onClose: () => void }> = ({ target, onClose }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>("connecting");
  // Avtoijro siyosati: ovozli oqim avtomatik ijro etilmaydi (qora ekran). Shuning uchun ovozsiz
  // boshlaymiz (muted autoplay har doim ruxsat etiladi), admin "Ovozli" bosib eshitadi.
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!target) return;
    let closed = false;
    let watcherId = "";
    let sourceConnId = "";
    let pc: RTCPeerConnection | null = null;
    const callId = newCallId();
    let watchTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      closed = true;
      if (watchTimer) clearTimeout(watchTimer);
      if (sourceConnId) void rtcStop(sourceConnId, callId);
      try {
        pc?.close();
      } catch {
        /* ignore */
      }
      stream.close();
    };

    const tryWatch = (sources: Array<{ connId: string; userId: string }>) => {
      if (closed || sourceConnId) return;
      const src = sources.find((s) => s.userId === target.userId);
      if (!src) return;
      sourceConnId = src.connId;
      if (watchTimer) clearTimeout(watchTimer);
      setState("waiting");
      void rtcWatch(src.connId, callId).catch(() => setState("error"));
    };

    const onEvent = async (e: RtcEvent) => {
      if (closed) return;
      if (e.event === "hello") {
        watcherId = e.data.connId;
      } else if (e.event === "sources") {
        tryWatch(e.data.list);
      } else if (e.event === "signal") {
        if (e.data.callId !== callId) return;
        if (e.data.kind === "offer") {
          pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
          pc.ontrack = (ev) => {
            const v = videoRef.current;
            if (v && ev.streams[0]) {
              v.srcObject = ev.streams[0];
              v.muted = true; // ijro kafolati uchun ovozsiz boshlanadi
              v.play().catch(() => undefined);
              setState("live");
            }
          };
          pc.onicecandidate = (ev) => {
            if (ev.candidate && sourceConnId) void rtcSignal(sourceConnId, callId, "ice", ev.candidate.toJSON());
          };
          pc.onconnectionstatechange = () => {
            if (pc && ["failed", "disconnected", "closed"].includes(pc.connectionState) && !closed) setState("error");
          };
          await pc.setRemoteDescription(e.data.data as RTCSessionDescriptionInit);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          void rtcSignal(e.data.from, callId, "answer", answer);
        } else if (e.data.kind === "ice" && pc) {
          try {
            await pc.addIceCandidate(e.data.data as RTCIceCandidateInit);
          } catch {
            /* ignore */
          }
        }
      } else if (e.event === "peer-gone") {
        if (e.data.connId === sourceConnId && !closed) setState("offline");
      }
    };

    setState("connecting");
    const stream = openRtcStream("watcher", (e) => void onEvent(e));
    // Manba topilmasa — jonli emas
    watchTimer = setTimeout(() => {
      if (!closed && !sourceConnId) setState("offline");
    }, 6000);

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.userId]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={cn2("absolute inline-flex h-full w-full rounded-full opacity-70", state === "live" ? "animate-ping bg-rose-400" : "")} />
              <span className={cn2("relative inline-flex h-2.5 w-2.5 rounded-full", state === "live" ? "bg-rose-500" : "bg-slate-400")} />
            </span>
            {t("live.watching", { name: target?.name ?? "" })}
          </DialogTitle>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "4 / 3" }}>
          <video ref={videoRef} autoPlay playsInline muted={muted} className="h-full w-full object-contain" />
          {state !== "live" && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 text-center text-white">
              {state === "connecting" || state === "waiting" ? (
                <div className="space-y-2">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-70" />
                  <p className="text-sm opacity-80">{state === "waiting" ? t("live.connecting") : t("live.starting")}</p>
                </div>
              ) : state === "offline" ? (
                <div className="space-y-2">
                  <VideoOff className="mx-auto h-8 w-8 opacity-60" />
                  <p className="text-sm opacity-80">{t("live.offline")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <VideoOff className="mx-auto h-8 w-8 text-rose-400" />
                  <p className="text-sm opacity-80">{t("live.error")}</p>
                </div>
              )}
            </div>
          )}
          {state === "live" && (
            <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-rose-600/90 px-2.5 py-1 text-xs font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t("live.oneway_hint")}</p>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={toggleMute} disabled={state !== "live"}>
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {muted ? t("live.unmute") : t("live.mute")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// kichik cn (import qilmaslik uchun)
function cn2(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export default LiveViewer;

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Mic, MicOff, VideoOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { startWatch, type WatchState } from "@/lib/rtc-watcher";
import { cn } from "@/lib/utils";

/** Kuzatiladigan foydalanuvchi (onlayn kartadan) */
export interface WatchTarget {
  userId: string;
  name: string;
}

/**
 * Admin tomoni: onlayn foydalanuvchining kamerasini JONLI ko'radi va eshitadi (bir tomonlama).
 * Barcha WebRTC mantiq rtc-watcher singletonida — bu shunchaki ko'rinish.
 */
const LiveViewer: React.FC<{ target: WatchTarget | null; onClose: () => void }> = ({ target, onClose }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<WatchState>("connecting");
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!target) return;
    setMuted(true);
    const ctrl = startWatch(target.userId, {
      onState: setState,
      onStream: (stream) => {
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.muted = true;
          v.play().catch(() => undefined);
        }
      },
    });
    return () => ctrl.stop();
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
              <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-70", state === "live" && "animate-ping bg-rose-400")} />
              <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", state === "live" ? "bg-rose-500" : "bg-slate-400")} />
            </span>
            {t("live.watching", { name: target?.name ?? "" })}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("live.oneway_hint")}</DialogDescription>
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
              ) : (
                <div className="space-y-2">
                  <VideoOff className={cn("mx-auto h-8 w-8", state === "error" ? "text-rose-400" : "opacity-60")} />
                  <p className="text-sm opacity-80">{state === "offline" ? t("live.offline") : t("live.error")}</p>
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

export default LiveViewer;

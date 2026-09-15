"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/lib/api";
import { acquireMedia, releaseMedia } from "@/lib/media-devices";
import { getIceServers, openRtcStream, rtcSignal, type RtcEvent } from "@/lib/rtc";

/**
 * Kuzatiluvchi tomon: tizimga kirgan har qanday foydalanuvchi brauzerida ishlaydi.
 * Superadmin kuzatishni so'raganda kamera+mikrofonni yoqib, oqimni to'g'ridan-to'g'ri (WebRTC) yuboradi.
 * Oqim ketayotganda ekranda doimiy "Kamera yoniq" belgisi ko'rinadi (yashirin emas).
 */
const LiveSource: React.FC = () => {
  const { t } = useTranslation();
  const [live, setLive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const heldRef = useRef<{ cam: MediaStream | null; mic: MediaStream | null } | null>(null);
  const callsRef = useRef<Map<string, { pc: RTCPeerConnection; watcherUserId: string }>>(new Map());

  useEffect(() => {
    if (!auth.token) return;
    let closed = false;

    /**
     * Kamera va mikrofon UMUMIY oqimdan olinadi (media-devices): imtihon yozuvi
     * bilan bir vaqtda ishlaganda qurilma ikki marta ochilmaydi.
     */
    const ensureStream = async (): Promise<MediaStream | null> => {
      if (streamRef.current) return streamRef.current;
      const [cam, mic] = await Promise.all([acquireMedia("camera"), acquireMedia("mic")]);
      if (!cam && !mic) return null; // ruxsat berilmadi — kuzatib bo'lmaydi
      heldRef.current = { cam, mic };
      const s = new MediaStream([...(cam?.getVideoTracks() ?? []), ...(mic?.getAudioTracks() ?? [])]);
      streamRef.current = s;
      return s;
    };

    const releaseStream = () => {
      const held = heldRef.current;
      if (held) {
        releaseMedia("camera", held.cam);
        releaseMedia("mic", held.mic);
        heldRef.current = null;
      }
      streamRef.current = null;
    };

    const refreshLive = () => setLive(callsRef.current.size > 0);

    const endCall = (callId: string) => {
      const c = callsRef.current.get(callId);
      if (c) {
        try {
          c.pc.close();
        } catch {
          /* ignore */
        }
        callsRef.current.delete(callId);
      }
      if (callsRef.current.size === 0) releaseStream();
      refreshLive();
    };

    const startCall = async (callId: string, watcherUserId: string) => {
      if (callsRef.current.has(callId)) return; // takroriy watch-start
      const stream = await ensureStream();
      if (closed) return;
      if (!stream) {
        // Kamera/mikrofon ruxsati yo'q — admin cheksiz kutmasin, aniq javob yuboramiz
        void rtcSignal(watcherUserId, "watcher", callId, "denied", { reason: "no-permission" });
        return;
      }
      const pc = new RTCPeerConnection({ iceServers: await getIceServers() });
      callsRef.current.set(callId, { pc, watcherUserId });
      refreshLive();
      stream.getTracks().forEach((tr) => pc.addTrack(tr, stream));
      pc.onicecandidate = (e) => {
        if (e.candidate) void rtcSignal(watcherUserId, "watcher", callId, "ice", e.candidate.toJSON());
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "closed"].includes(pc.connectionState)) endCall(callId);
      };
      // "disconnected" bir muncha vaqt tiklanmasa — qo'ng'iroqni yopamiz (belgi qotib qolmasin)
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState !== "disconnected") return;
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected") endCall(callId);
        }, 15000);
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      void rtcSignal(watcherUserId, "watcher", callId, "offer", offer);
    };

    const onEvent = async (e: RtcEvent) => {
      if (closed) return;
      if (e.event === "watch-start") {
        await startCall(e.data.callId, e.data.watcherUserId);
      } else if (e.event === "watch-stop") {
        endCall(e.data.callId);
      } else if (e.event === "signal") {
        const c = callsRef.current.get(e.data.callId);
        if (!c) return;
        try {
          if (e.data.kind === "answer") await c.pc.setRemoteDescription(e.data.data as RTCSessionDescriptionInit);
          else if (e.data.kind === "ice") await c.pc.addIceCandidate(e.data.data as RTCIceCandidateInit);
        } catch {
          /* ignore */
        }
      }
    };

    const stream = openRtcStream("source", (e) => void onEvent(e));

    const calls = callsRef.current;
    return () => {
      closed = true;
      stream.close();
      for (const c of calls.values()) {
        try {
          c.pc.close();
        } catch {
          /* ignore */
        }
      }
      calls.clear();
      releaseStream();
    };
  }, []);

  if (!live) return null;
  // Kulrang, kamtarona belgi — chap pastki burchakda
  return (
    <div
      className="fixed bottom-3 left-3 z-[2147483000] inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-800/85 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg backdrop-blur-sm"
      role="status"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
      </span>
      {t("live.camera_on")}
    </div>
  );
};

export default LiveSource;

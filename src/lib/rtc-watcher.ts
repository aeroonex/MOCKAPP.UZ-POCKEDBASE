import { ICE_SERVERS, newCallId, openRtcStream, rtcSignal, rtcStop, rtcWatch, type RtcEvent } from "@/lib/rtc";

/**
 * Kuzatuvchi (admin) tomonidagi doimiy WebRTC menejeri — MODUL darajasida singleton.
 * Bitta watcher SSE oqimini ochib ushlab turadi (dialog ochilib-yopilganda uzilmaydi),
 * qo'ng'iroqlarni callId bo'yicha boshqaradi. Signallar barqaror userId bo'yicha yo'naltiriladi,
 * shuning uchun SSE uzilib qayta ulansa ham qo'ng'iroq buzilmaydi.
 */

export type WatchState = "connecting" | "waiting" | "live" | "offline" | "error";

interface WatchCbs {
  onStream: (stream: MediaStream) => void;
  onState: (s: WatchState) => void;
}
interface Call extends WatchCbs {
  callId: string;
  targetUserId: string;
  pc: RTCPeerConnection | null;
  alive: boolean;
}

let sse: { close: () => void } | null = null;
let ready: Promise<void> | null = null;
const calls = new Map<string, Call>();

function ensureSSE(): Promise<void> {
  if (ready) return ready;
  ready = new Promise<void>((resolve) => {
    sse = openRtcStream("watcher", onEvent, () => {
      /* onOpen — hello kutamiz */
    });
    // hello kelganda tayyor deb hisoblaymiz (pastdagi onEvent resolve qiladi)
    resolveReady = resolve;
  });
  return ready;
}
let resolveReady: (() => void) | null = null;

async function onEvent(e: RtcEvent): Promise<void> {
  if (e.event === "hello") {
    resolveReady?.();
    resolveReady = null;
  } else if (e.event === "signal") {
    const call = calls.get(e.data.callId);
    if (!call || !call.alive) return;
    try {
      if (e.data.kind === "offer") {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        call.pc = pc;
        pc.ontrack = (ev) => {
          if (ev.streams[0]) call.onStream(ev.streams[0]);
        };
        pc.onicecandidate = (ev) => {
          if (ev.candidate) void rtcSignal(call.targetUserId, "source", call.callId, "ice", ev.candidate.toJSON());
        };
        pc.oniceconnectionstatechange = () => {
          const st = pc.iceConnectionState;
          if (st === "connected" || st === "completed") call.onState("live");
          else if (st === "failed") call.onState("error");
        };
        await pc.setRemoteDescription(e.data.data as RTCSessionDescriptionInit);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        void rtcSignal(call.targetUserId, "source", call.callId, "answer", answer);
      } else if (e.data.kind === "ice" && call.pc) {
        await call.pc.addIceCandidate(e.data.data as RTCIceCandidateInit).catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
  }
}

/** Foydalanuvchini kuzatishni boshlaydi. Qaytadi: to'xtatuvchi. */
export function startWatch(targetUserId: string, cbs: WatchCbs): { stop: () => void } {
  const callId = newCallId();
  const call: Call = { callId, targetUserId, pc: null, alive: true, ...cbs };
  calls.set(callId, call);
  cbs.onState("connecting");

  void (async () => {
    await ensureSSE();
    if (!call.alive) return;
    cbs.onState("waiting");
    try {
      await rtcWatch(targetUserId, callId);
    } catch (err) {
      // 404 — source onlayn emas
      if (call.alive) cbs.onState("offline");
    }
  })();

  return {
    stop: () => {
      call.alive = false;
      void rtcStop(targetUserId, "source", callId);
      try {
        call.pc?.close();
      } catch {
        /* ignore */
      }
      calls.delete(callId);
    },
  };
}

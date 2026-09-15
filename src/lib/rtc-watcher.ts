import { getIceServers, newCallId, openRtcStream, rtcSignal, rtcStop, rtcWatch, type RtcEvent } from "@/lib/rtc";

/**
 * Kuzatuvchi (admin) tomonidagi doimiy WebRTC menejeri — MODUL darajasida singleton.
 * Bitta watcher SSE oqimini ochib ushlab turadi (dialog ochilib-yopilganda uzilmaydi),
 * qo'ng'iroqlarni callId bo'yicha boshqaradi. Signallar barqaror userId bo'yicha yo'naltiriladi,
 * shuning uchun SSE uzilib qayta ulansa ham qo'ng'iroq buzilmaydi.
 */

export type WatchState = "connecting" | "waiting" | "live" | "offline" | "denied" | "error";

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
let ready: Promise<boolean> | null = null;
const calls = new Map<string, Call>();

/** SSE tayyor bo'lishini kutadi. Ulanmasa (yoki 10 s javob bo'lmasa) false qaytaradi —
 *  ilgari bu holatda "ulanmoqda" holati abadiy qotib qolardi. */
function ensureSSE(): Promise<boolean> {
  if (ready) return ready;
  ready = new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (!ok) {
        // keyingi urinish yangi ulanish ochsin
        sse?.close();
        sse = null;
        ready = null;
        resolveReady = null;
      }
      resolve(ok);
    };
    resolveReady = () => done(true);
    sse = openRtcStream("watcher", onEvent, undefined, () => done(false));
    setTimeout(() => done(false), 10_000);
  });
  return ready;
}
let resolveReady: (() => void) | null = null;

async function onEvent(e: RtcEvent): Promise<void> {
  if (e.event === "hello") {
    resolveReady?.();
    resolveReady = null;
    return;
  }
  if (e.event !== "signal") return;
  const call = calls.get(e.data.callId);
  if (!call || !call.alive) return;
  // O'quvchi kamerani bermadi — cheksiz "ulanmoqda" o'rniga aniq xabar
  if (e.data.kind === "denied") {
    call.onState("denied");
    return;
  }
  try {
    if (e.data.kind === "offer") {
      const pc = new RTCPeerConnection({ iceServers: await getIceServers() });
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

/** Foydalanuvchini kuzatishni boshlaydi. Qaytadi: to'xtatuvchi. */
export function startWatch(targetUserId: string, cbs: WatchCbs): { stop: () => void } {
  const callId = newCallId();
  const call: Call = { callId, targetUserId, pc: null, alive: true, ...cbs };
  calls.set(callId, call);
  cbs.onState("connecting");

  void (async () => {
    const ok = await ensureSSE();
    if (!call.alive) return;
    if (!ok) {
      cbs.onState("error");
      return;
    }
    cbs.onState("waiting");
    try {
      await rtcWatch(targetUserId, callId);
    } catch {
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

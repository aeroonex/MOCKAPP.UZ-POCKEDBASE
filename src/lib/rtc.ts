import { API_BASE_URL, api, auth } from "@/lib/api";

/**
 * Jonli kuzatuv uchun WebRTC signalizatsiya mijozi (SSE orqali qabul, POST orqali yuborish).
 * Media WebRTC bilan to'g'ridan-to'g'ri (P2P) ketadi — server faqat kichik signal xabarlarini uzatadi.
 */

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // O'z TURN (relay) serverimiz (coturn, 37.60.249.121:3478) — turli tarmoqlar orasida
  // to'g'ridan-to'g'ri P2P o'rnatilmasa, media shu relay orqali o'tadi (qora ekran bo'lmasligi uchun).
  {
    urls: ["turn:37.60.249.121:3478?transport=udp", "turn:37.60.249.121:3478?transport=tcp"],
    username: "edumock",
    credential: "eduturn7x2p9qKmA3",
  },
];

export type RtcRole = "source" | "watcher";
export type RtcEvent =
  | { event: "hello"; data: { connId: string; userId: string } }
  | { event: "sources"; data: { list: Array<{ userId: string; sid: string; name: string }> } }
  | { event: "watch-start"; data: { callId: string; watcherUserId: string } }
  | { event: "watch-stop"; data: { callId: string } }
  | { event: "signal"; data: { callId: string; kind: "offer" | "answer" | "ice"; data: unknown; fromUserId: string } };

/**
 * SSE oqimni ochadi (fetch + Authorization sarlavhasi bilan — EventSource header qo'sha olmaydi).
 * Uzilsa avtomatik qayta ulanadi. `close()` bilan yopiladi.
 */
export function openRtcStream(role: RtcRole, onEvent: (e: RtcEvent) => void, onOpen?: () => void): { close: () => void } {
  let closed = false;
  let controller: AbortController | null = null;

  const connect = async () => {
    if (closed || !auth.token) return;
    controller = new AbortController();
    try {
      const res = await fetch(`${API_BASE_URL}/api/rtc/stream?role=${role}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`sse ${res.status}`);
      onOpen?.();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const chunk of parts) {
          let ev = "message";
          let data = "";
          for (const line of chunk.split("\n")) {
            if (line.startsWith("event:")) ev = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          try {
            onEvent({ event: ev, data: JSON.parse(data) } as RtcEvent);
          } catch {
            /* e'tiborsiz */
          }
        }
      }
    } catch {
      /* uzildi — pastda qayta ulanamiz */
    }
    if (!closed) setTimeout(connect, 3000);
  };
  void connect();

  return {
    close: () => {
      closed = true;
      controller?.abort();
    },
  };
}

export const rtcWatch = (targetUserId: string, callId: string) => api.post("/api/rtc/watch", { targetUserId, callId });
export const rtcSignal = (toUserId: string, toRole: RtcRole, callId: string, kind: "offer" | "answer" | "ice", data: unknown) =>
  api.post("/api/rtc/signal", { toUserId, toRole, callId, kind, data }).catch(() => undefined);
export const rtcStop = (toUserId: string, toRole: RtcRole, callId: string) =>
  api.post("/api/rtc/stop", { toUserId, toRole, callId }).catch(() => undefined);

export const newCallId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

import { API_BASE_URL, api, auth } from "@/lib/api";

/**
 * Jonli kuzatuv uchun WebRTC signalizatsiya mijozi (SSE orqali qabul, POST orqali yuborish).
 * Media WebRTC bilan to'g'ridan-to'g'ri (P2P) ketadi — server faqat kichik signal xabarlarini uzatadi.
 */

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export type RtcRole = "source" | "watcher";
export type RtcEvent =
  | { event: "hello"; data: { connId: string } }
  | { event: "sources"; data: { list: Array<{ connId: string; userId: string; sid: string; name: string }> } }
  | { event: "watch-start"; data: { callId: string; watcherId: string } }
  | { event: "watch-stop"; data: { callId: string } }
  | { event: "signal"; data: { callId: string; kind: "offer" | "answer" | "ice"; data: unknown; from: string } }
  | { event: "peer-gone"; data: { connId: string } };

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

export const rtcWatch = (target: string, callId: string) => api.post("/api/rtc/watch", { target, callId });
export const rtcSignal = (to: string, callId: string, kind: "offer" | "answer" | "ice", data: unknown) =>
  api.post("/api/rtc/signal", { to, callId, kind, data }).catch(() => undefined);
export const rtcStop = (to: string, callId: string) => api.post("/api/rtc/stop", { to, callId }).catch(() => undefined);

export const newCallId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

import { API_BASE_URL, api, auth } from "@/lib/api";

/**
 * Jonli kuzatuv uchun WebRTC signalizatsiya mijozi (SSE orqali qabul, POST orqali yuborish).
 * Media WebRTC bilan to'g'ridan-to'g'ri (P2P) ketadi — server faqat kichik signal xabarlarini uzatadi.
 */

/** Zaxira: TURN olinmasa hech bo'lmasa STUN bilan urinib ko'ramiz. */
const FALLBACK_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

let iceCache: { servers: RTCIceServer[]; until: number } | null = null;

/**
 * ICE serverlari serverdan olinadi: TURN uchun MUDDATLI login/parol beriladi
 * (doimiy parol bundle ichida bo'lsa, begonalar relay trafigimizni ishlatishi mumkin edi).
 */
export async function getIceServers(): Promise<RTCIceServer[]> {
  if (iceCache && iceCache.until > Date.now()) return iceCache.servers;
  try {
    const res = await api.get<{ iceServers: RTCIceServer[]; ttl: number }>("/api/rtc/ice");
    const servers = res?.iceServers?.length ? res.iceServers : FALLBACK_ICE;
    // Muddat tugashidan ancha oldin yangilaymiz
    iceCache = { servers, until: Date.now() + Math.max(60, (res?.ttl ?? 3600) / 2) * 1000 };
    return servers;
  } catch {
    return FALLBACK_ICE;
  }
}

export type RtcRole = "source" | "watcher";
export type RtcSignalKind = "offer" | "answer" | "ice" | "denied";
export type RtcEvent =
  | { event: "hello"; data: { connId: string; userId: string } }
  | { event: "sources"; data: { list: Array<{ userId: string; sid: string; name: string }> } }
  | { event: "watch-start"; data: { callId: string; watcherUserId: string } }
  | { event: "watch-stop"; data: { callId: string } }
  | { event: "signal"; data: { callId: string; kind: RtcSignalKind; data: unknown; fromUserId: string } };

/**
 * SSE oqimni ochadi (fetch + Authorization sarlavhasi bilan — EventSource header qo'sha olmaydi).
 * Uzilsa o'sib boradigan kechikish bilan qayta ulanadi; 401/402/403 kelsa qayta urinmaydi
 * (aks holda har 3 sekundda abadiy so'rov ketardi). `close()` bilan yopiladi.
 */
export function openRtcStream(
  role: RtcRole,
  onEvent: (e: RtcEvent) => void,
  onOpen?: () => void,
  onFatal?: (status: number) => void,
): { close: () => void } {
  let closed = false;
  let controller: AbortController | null = null;
  let attempt = 0;
  let timer: number | null = null;

  const connect = async () => {
    if (closed || !auth.token) return;
    controller = new AbortController();
    try {
      const res = await fetch(`${API_BASE_URL}/api/rtc/stream?role=${role}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
        signal: controller.signal,
      });
      // Ruxsat yo'q / obuna tugagan / token yaroqsiz — qayta urinishdan foyda yo'q
      if (res.status === 401 || res.status === 402 || res.status === 403) {
        closed = true;
        onFatal?.(res.status);
        return;
      }
      if (!res.ok || !res.body) throw new Error(`sse ${res.status}`);
      attempt = 0;
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
    if (closed) return;
    // 3s, 6s, 12s, 24s ... eng ko'pi 60s
    const wait = Math.min(60_000, 3000 * 2 ** Math.min(attempt++, 5));
    timer = window.setTimeout(connect, wait);
  };
  void connect();

  return {
    close: () => {
      closed = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
    },
  };
}

export const rtcWatch = (targetUserId: string, callId: string) => api.post("/api/rtc/watch", { targetUserId, callId });
export const rtcSignal = (toUserId: string, toRole: RtcRole, callId: string, kind: RtcSignalKind, data: unknown) =>
  api.post("/api/rtc/signal", { toUserId, toRole, callId, kind, data }).catch(() => undefined);
export const rtcStop = (toUserId: string, toRole: RtcRole, callId: string) =>
  api.post("/api/rtc/stop", { toUserId, toRole, callId }).catch(() => undefined);

export const newCallId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

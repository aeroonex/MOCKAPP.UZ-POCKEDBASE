/**
 * Kamera va mikrofonning BITTA umumiy oqimi (refcount bilan).
 *
 * Ilgari kamerani/mikrofonni bir vaqtda uch joy alohida ochardi: imtihon yozuvi,
 * "Qurilma tekshiruvi" va jonli kuzatuv. Ba'zi Windows drayverlari ikkinchi
 * `getUserMedia` ga xato yoki jimjit oqim qaytaradi — imtihon yozuvi buzilishi mumkin.
 * Endi hamma shu yerdan oladi: qurilma bir marta ochiladi, oxirgi egasi qo'yib
 * yuborganda o'chadi.
 *
 * Muhim: trek'larni O'ZINGIZ `stop()` qilmang — `release()` chaqiring.
 */

type Kind = "camera" | "mic";

interface Entry {
  stream: MediaStream;
  users: number;
}

const entries = new Map<Kind, Entry>();
const pending = new Map<Kind, Promise<MediaStream | null>>();
const listeners = new Set<(kind: Kind) => void>();

const CONSTRAINTS: Record<Kind, MediaStreamConstraints> = {
  camera: {
    video: { width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 15, max: 30 }, facingMode: "user" },
    audio: false,
  },
  mic: {
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  },
};

function notify(kind: Kind) {
  for (const cb of listeners) {
    try {
      cb(kind);
    } catch {
      /* ignore */
    }
  }
}

/** Qurilma o'chib qolsa (USB kamera uzildi) keshni tozalaymiz. */
function watchEnded(kind: Kind, stream: MediaStream) {
  stream.getTracks().forEach((tr) =>
    tr.addEventListener("ended", () => {
      const e = entries.get(kind);
      if (e && e.stream === stream) {
        entries.delete(kind);
        notify(kind);
      }
    }),
  );
}

/**
 * Qurilmani band qiladi (kerak bo'lsa ochadi). Ruxsat berilmasa `null`.
 * Har bir `acquire` uchun bitta `release` bo'lishi shart.
 */
export async function acquireMedia(kind: Kind): Promise<MediaStream | null> {
  const existing = entries.get(kind);
  if (existing && existing.stream.getTracks().some((t) => t.readyState === "live")) {
    existing.users++;
    return existing.stream;
  }
  const inflight = pending.get(kind);
  if (inflight) {
    const s = await inflight;
    if (s) {
      const e = entries.get(kind);
      if (e) e.users++;
    }
    return s;
  }
  if (!navigator.mediaDevices?.getUserMedia) return null;
  const p = navigator.mediaDevices
    .getUserMedia(CONSTRAINTS[kind])
    .then((s) => {
      entries.set(kind, { stream: s, users: 1 });
      watchEnded(kind, s);
      notify(kind);
      return s;
    })
    .catch(() => null)
    .finally(() => pending.delete(kind));
  pending.set(kind, p);
  return p;
}

/** Qurilmani qo'yib yuboradi; oxirgi egasi ketganda kamera/mikrofon o'chadi. */
export function releaseMedia(kind: Kind, stream?: MediaStream | null): void {
  const e = entries.get(kind);
  if (!e) return;
  if (stream && stream !== e.stream) return; // eski (allaqachon almashgan) oqim
  e.users = Math.max(0, e.users - 1);
  if (e.users === 0) {
    e.stream.getTracks().forEach((tr) => tr.stop());
    entries.delete(kind);
    notify(kind);
  }
}

/** Hozir ochiq oqim (band qilmaydi) — faqat ko'rsatish uchun. */
export function currentMedia(kind: Kind): MediaStream | null {
  return entries.get(kind)?.stream ?? null;
}

/** Oqim ochilgan/o'chgan paytda xabar beradi. */
export function onMediaChange(cb: (kind: Kind) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

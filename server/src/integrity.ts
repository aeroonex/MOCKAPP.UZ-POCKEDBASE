import { z } from "zod";

/**
 * Halollik nazorati hodisalari (mijoz test davomida yig'adi): oynadan chiqish, to'liq ekrandan chiqish,
 * yuz kadrda yo'qligi, bir nechta yuz. Yozuv bilan birga saqlanadi va Telegram xabarida xulosa qilinadi.
 */

export const integrityEventSchema = z.object({
  t: z.coerce.number().min(0).max(86400),
  type: z.enum(["window_blur", "window_focus", "fullscreen_exit", "fullscreen_enter", "face_missing", "face_back", "faces_multiple"]),
  detail: z.string().max(200).optional(),
});
export type IntegrityEvent = z.infer<typeof integrityEventSchema>;

/** Multipart (matn) yoki JSON (massiv) ko'rinishida kelgan hodisalarni tekshirib qaytaradi; xato bo'lsa bo'sh. */
export function parseIntegrity(raw: unknown): IntegrityEvent[] {
  if (raw === undefined || raw === null || raw === "") return [];
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const parsed = z.array(integrityEventSchema).max(500).safeParse(value);
  return parsed.success ? parsed.data : [];
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** Telegram xabari uchun bir qatorli xulosa (HTML). Hodisa bo'lmasa null. */
export function integritySummaryHtml(events: IntegrityEvent[]): string | null {
  const blur = events.filter((e) => e.type === "window_blur");
  const fs = events.filter((e) => e.type === "fullscreen_exit");
  const multi = events.filter((e) => e.type === "faces_multiple");
  let faceSec = 0;
  let since: number | null = null;
  const faceAt: number[] = [];
  for (const e of events) {
    if (e.type === "face_missing") {
      since = e.t;
      faceAt.push(e.t);
    } else if (e.type === "face_back" && since !== null) {
      faceSec += Math.max(0, e.t - since);
      since = null;
    }
  }
  const parts: string[] = [];
  if (blur.length) parts.push(`oynadan chiqish ×${blur.length} (${blur.slice(0, 5).map((e) => fmt(e.t)).join(", ")}${blur.length > 5 ? "…" : ""})`);
  if (fs.length) parts.push(`to'liq ekrandan chiqish ×${fs.length} (${fs.slice(0, 5).map((e) => fmt(e.t)).join(", ")}${fs.length > 5 ? "…" : ""})`);
  if (faceAt.length) parts.push(`yuz kadrda yo'q ${Math.round(faceSec)} s (${faceAt.slice(0, 5).map(fmt).join(", ")}${faceAt.length > 5 ? "…" : ""})`);
  if (multi.length) parts.push(`bir nechta yuz ×${multi.length} (${multi.slice(0, 5).map((e) => fmt(e.t)).join(", ")}${multi.length > 5 ? "…" : ""})`);
  if (!parts.length) return null;
  return `🛡 Nazorat: ${parts.join("; ")}`;
}

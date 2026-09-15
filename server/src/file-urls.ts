import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

/**
 * Yuklangan fayllar uchun imzolangan havolalar.
 *
 * Imtihon videolari va to'lov cheklari shaxsiy ma'lumot — ular `/files/...` orqali
 * hammaga ochiq bo'lmasligi kerak. Havolaga muddat (`e`) va imzo (`s`) qo'shiladi;
 * server imzoni tekshiradi. `<video src>` va Telegram havolalari sarlavha yubora
 * olmaydi, shuning uchun token URL ichida (JWT_SECRET bilan HMAC).
 *
 * Savol rasmlari va TTS mp3 fayllari ochiq qoladi (shaxsiy ma'lumot emas, keshlanadi).
 */

/** Imzo talab qiladigan papkalar. */
const PROTECTED_PREFIXES = ["videos/", "receipts/", "billing/"];

/** Havola muddati: Telegram'dagi eski xabarlar ham ochilishi uchun uzoq. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isProtectedRel(rel: string): boolean {
  return PROTECTED_PREFIXES.some((p) => rel.startsWith(p));
}

function signature(rel: string, exp: number): string {
  return createHmac("sha256", config.jwtSecret).update(`${rel}|${exp}`).digest("base64url").slice(0, 27);
}

/** `?e=...&s=...` qo'shimchasi (himoyalangan papkalar uchun; boshqalarga bo'sh satr). */
export function fileSignature(rel: string, ttlMs = TTL_MS): string {
  if (!isProtectedRel(rel)) return "";
  const exp = Date.now() + ttlMs;
  return `?e=${exp}&s=${signature(rel, exp)}`;
}

/** Imzoni tekshiradi (muddati o'tgan yoki yaroqsiz bo'lsa false). */
export function verifyFileSignature(rel: string, e: string | null, s: string | null): boolean {
  if (!e || !s) return false;
  const exp = Number(e);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = Buffer.from(signature(rel, exp));
  const got = Buffer.from(s);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

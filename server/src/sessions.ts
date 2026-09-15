import type { FastifyRequest } from "fastify";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform, type Readable } from "node:stream";
import { one, query } from "./db.js";
import { config } from "./config.js";
import { notifyLogin, notifyLogout } from "./admin-bot.js";

// Login kamera kadrlari — MAXFIY papka (ochiq /files/ dan tashqarida, faqat admin endpoint o'qiydi)
const PHOTO_DIR = path.join(config.dataDir, "private", "login-photos");
const safeSeg = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

/**
 * Kirish sessiyalari va hodisalarini yozadi: kim, qachon, qaysi paneldan, qayerdan (IP + joylashuv),
 * qanday qurilmadan. Har autentifikatsiyalangan so'rovda "oxirgi faollik" yangilanadi (onlayn holati).
 */

export type Panel = "dashboard" | "station" | "admin";

// ---------- IP va davlat (Cloudflare orqasida) ----------

/** Haqiqiy mijoz IP: Cloudflare -> X-Forwarded-For -> ulanish manzili. */
export function clientIp(req: FastifyRequest): string {
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf) return cf.trim();
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff) return xff.split(",")[0].trim();
  return req.ip || "";
}

const COUNTRY_NAME: Record<string, string> = {
  UZ: "O'zbekiston", RU: "Rossiya", KZ: "Qozog'iston", KG: "Qirg'iziston", TJ: "Tojikiston",
  TM: "Turkmaniston", TR: "Turkiya", US: "AQSH", GB: "Buyuk Britaniya", DE: "Germaniya",
  KR: "Janubiy Koreya", CN: "Xitoy", IN: "Hindiston", AE: "BAA", SA: "Saudiya Arabistoni",
  AF: "Afg'oniston", AZ: "Ozarbayjon", UA: "Ukraina", PL: "Polsha", FR: "Fransiya",
};

function countryFromCf(req: FastifyRequest): { code: string; name: string } {
  const c = req.headers["cf-ipcountry"];
  const code = typeof c === "string" && c.length === 2 && c !== "XX" && c !== "T1" ? c.toUpperCase() : "";
  return { code, name: code ? COUNTRY_NAME[code] || code : "" };
}

const isPrivateIp = (ip: string) =>
  !ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || ip.startsWith("::ffff:127.") || ip.startsWith("fc") || ip.startsWith("fd");

// IP -> {country, city} keshi (bir necha soatga). Shahar uchun bepul ip-api.com (kalitsiz).
const geoCache = new Map<string, { country: string; city: string; at: number }>();
const GEO_TTL = 6 * 60 * 60 * 1000;

async function lookupCity(ip: string): Promise<{ country: string; city: string }> {
  if (isPrivateIp(ip)) return { country: "", city: "" };
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.at < GEO_TTL) return { country: cached.country, city: cached.city };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const d = (await res.json()) as { status?: string; country?: string; city?: string };
      if (d.status === "success") {
        const out = { country: d.country || "", city: d.city || "" };
        geoCache.set(ip, { ...out, at: Date.now() });
        return out;
      }
    }
  } catch {
    /* tarmoq yo'q — shahar bo'sh qoladi */
  }
  return { country: "", city: "" };
}

// ---------- Qurilma (User-Agent) ----------

/** "Chrome · Windows" ko'rinishida qisqa qurilma nomi. */
export function parseDevice(ua: string): string {
  if (!ua) return "";
  let browser = "Brauzer";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/YaBrowser/.test(ua)) browser = "Yandex";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  let os = "";
  if (/Windows NT 10/.test(ua)) os = "Windows";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";
  const mobile = /Mobile|Android|iPhone/.test(ua) ? " 📱" : "";
  return [browser, os].filter(Boolean).join(" · ") + mobile;
}

// ---------- Yozish ----------

interface Ctx {
  ip: string;
  device: string;
  country: string;
  city: string;
}

/**
 * Kirish konteksti — TARMOQNI KUTMAYDI. Shahar keshda bo'lsa darhol qo'shiladi,
 * bo'lmasa kirish javobi kechiktirilmaydi: keshni fonda to'ldiramiz va sessiya
 * yozuvini keyinroq yangilaymiz (ilgari ip-api javobi 2.5 s gacha kutilardi).
 */
function context(req: FastifyRequest): Ctx {
  const ip = clientIp(req);
  const device = parseDevice(String(req.headers["user-agent"] || ""));
  const cf = countryFromCf(req);
  const cached = geoCache.get(ip);
  const fresh = cached && Date.now() - cached.at < GEO_TTL ? cached : null;
  return { ip, device, country: fresh?.country || cf.name, city: fresh?.city || "" };
}

/** Shaharni fonda aniqlab, sessiya va hodisa yozuvlarini yangilaydi. */
function fillGeoLater(ip: string, sessionId: string | null, userId: string | null): void {
  if (isPrivateIp(ip)) return;
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.at < GEO_TTL) return;
  void lookupCity(ip)
    .then(async (geo) => {
      if (!geo.city && !geo.country) return;
      if (sessionId) {
        await query(
          "UPDATE auth_sessions SET city = $2, country = COALESCE(NULLIF($3, ''), country) WHERE id = $1",
          [sessionId, geo.city, geo.country],
        ).catch(() => undefined);
      }
      if (userId) {
        await query(
          `UPDATE login_events SET city = $2, country = COALESCE(NULLIF($3, ''), country)
           WHERE id = (SELECT id FROM login_events WHERE user_id = $1 ORDER BY created DESC LIMIT 1)`,
          [userId, geo.city, geo.country],
        ).catch(() => undefined);
      }
    })
    .catch(() => undefined);
}

/** Muvaffaqiyatli kirish: sessiya yaratadi, login hodisasini yozadi, users jadvalini yangilaydi. Sessiya id qaytadi. */
export async function recordLogin(req: FastifyRequest, userId: string, panel: Panel): Promise<string> {
  const c = context(req);
  const ua = String(req.headers["user-agent"] || "").slice(0, 500);
  const session = await one<{ id: string }>(
    `INSERT INTO auth_sessions (user_id, panel, ip, user_agent, device, country, city)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [userId, panel, c.ip, ua, c.device, c.country, c.city],
  );
  await query(
    `INSERT INTO login_events (user_id, identity, panel, success, ip, device, country, city)
     VALUES ($1, $2, $3, TRUE, $4, $5, $6, $7)`,
    [userId, "", panel, c.ip, c.device, c.country, c.city],
  );
  await query(
    `UPDATE users SET last_login_at = now(), last_seen_at = now(), last_login_ip = $2, login_count = login_count + 1 WHERE id = $1`,
    [userId, c.ip],
  );
  fillGeoLater(c.ip, session!.id, userId); // shahar fonda aniqlanadi
  notifyLogin(session!.id); // superadmin botiga (rasm bilan, biroz kechikish bilan)
  return session!.id;
}

/** Muvaffaqiyatsiz kirish urinishi. */
export async function recordFailedLogin(req: FastifyRequest, identity: string, panel: Panel, reason: string): Promise<void> {
  const c = context(req);
  await query(
    `INSERT INTO login_events (identity, panel, success, reason, ip, device, country, city)
     VALUES ($1, $2, FALSE, $3, $4, $5, $6, $7)`,
    [identity.slice(0, 200), panel, reason.slice(0, 200), c.ip, c.device, c.country, c.city],
  );
}

/** Maxfiy papka ichidagi xavfsiz absolyut yo'l (papkadan chiqib ketmaydi). */
export function loginPhotoAbs(rel: string): string {
  const abs = path.resolve(PHOTO_DIR, rel);
  if (abs !== PHOTO_DIR && !abs.startsWith(PHOTO_DIR + path.sep)) throw new Error("Invalid path");
  return abs;
}

/** Kirishda olingan kamera kadrini shu sessiya va oxirgi login hodisasiga biriktiradi (limit 3 MB). */
export async function saveLoginPhoto(userId: string, sessionId: string, source: Readable): Promise<string> {
  const rel = path.posix.join(safeSeg(userId), `${safeSeg(sessionId)}.jpg`);
  const abs = loginPhotoAbs(rel);
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.part`;
  const limit = 3 * 1024 * 1024;
  let written = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      written += chunk.length;
      if (written > limit) return cb(new Error("too large"));
      cb(null, chunk);
    },
  });
  try {
    await pipeline(source, counter, fs.createWriteStream(tmp));
    await fsp.rename(tmp, abs);
  } catch (err) {
    await fsp.rm(tmp, { force: true }).catch(() => undefined);
    throw err;
  }
  await query("UPDATE auth_sessions SET photo_path = $2 WHERE id = $1 AND user_id = $3::uuid", [sessionId, rel, userId]).catch(() => undefined);
  await query(
    `UPDATE login_events SET photo_path = $2 WHERE id = (
       SELECT id FROM login_events WHERE user_id = $1 AND success ORDER BY created DESC LIMIT 1
     )`,
    [userId, rel],
  ).catch(() => undefined);
  return rel;
}

// Oxirgi faollik yangilanishini har so'rovda emas, ~30 s da bir marta yozamiz (bazani ayamaslik uchun)
const lastTouch = new Map<string, number>();
const TOUCH_MS = 30_000;

/** Autentifikatsiyalangan so'rovda sessiya "oxirgi faollik"ini yangilaydi (onlayn holati uchun). */
export function touchSession(userId: string): void {
  const now = Date.now();
  const prev = lastTouch.get(userId) || 0;
  if (now - prev < TOUCH_MS) return;
  lastTouch.set(userId, now);
  void query(
    `UPDATE auth_sessions SET last_seen = now(), requests = requests + 1
     WHERE id = (SELECT id FROM auth_sessions WHERE user_id = $1 AND ended_at IS NULL ORDER BY last_seen DESC LIMIT 1)`,
    [userId],
  ).catch(() => undefined);
  void query("UPDATE users SET last_seen_at = now() WHERE id = $1", [userId]).catch(() => undefined);
  if (lastTouch.size > 5000) lastTouch.clear();
}

/** Foydalanuvchi chiqqanda joriy sessiyani yopadi. */
export async function endSession(userId: string): Promise<void> {
  const info = await one<{ id: string; panel: string; name: string }>(
    `SELECT s.id, s.panel, COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.username) AS name
     FROM auth_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.user_id = $1 AND s.ended_at IS NULL ORDER BY s.last_seen DESC LIMIT 1`,
    [userId],
  ).catch(() => null);
  if (!info) return;
  await query("UPDATE auth_sessions SET ended_at = now() WHERE id = $1", [info.id]).catch(() => undefined);
  revokeSession(info.id);
  notifyLogout(info.name, info.panel);
}

// ---------- Yopilgan sessiyalar (token ham kuchsiz bo'ladi) ----------

/**
 * Yopilgan sessiyalar to'plami. JWT 30 kun yashaydi, shuning uchun "sessiyani yopish"
 * faqat belgilash bo'lib qolmasligi kerak: shu ro'yxatdagi `sid` bilan kelgan token
 * 401 qaytaradi (global hook tekshiradi). Xotirada — har so'rovda baza so'ralmaydi.
 */
const revoked = new Set<string>();

export function revokeSession(sessionId: string): void {
  if (sessionId) revoked.add(sessionId);
}

export function isSessionRevoked(sessionId: string): boolean {
  return revoked.has(sessionId);
}

/** Ishga tushganda: token muddati ichida yopilgan sessiyalarni xotiraga oladi. */
export async function loadRevokedSessions(): Promise<void> {
  const rows = await query<{ id: string }>(
    "SELECT id FROM auth_sessions WHERE ended_at IS NOT NULL AND ended_at > now() - interval '60 days'",
  ).catch(() => []);
  for (const r of rows) revoked.add(r.id);
  if (rows.length) console.log(`[sessions] ${rows.length} ta yopilgan sessiya yuklandi`);
}

/**
 * Eski nazorat yozuvlarini tozalaydi (disk cheksiz o'smasligi uchun):
 * kirish jurnali va yopilgan sessiyalar 180 kundan keyin, egasiz login rasmlari ham.
 */
export async function cleanupOldSessions(): Promise<void> {
  await query("DELETE FROM login_events WHERE created < now() - interval '180 days'").catch(() => undefined);
  const gone = await query<{ photo_path: string }>(
    `DELETE FROM auth_sessions
     WHERE ended_at IS NOT NULL AND ended_at < now() - interval '180 days'
     RETURNING photo_path`,
  ).catch(() => []);
  for (const r of gone) {
    if (!r.photo_path) continue;
    await fsp.rm(loginPhotoAbs(r.photo_path), { force: true }).catch(() => undefined);
  }
  // Bazada qolmagan login rasmlarini o'chiramiz (fayllar sessiyalardan ko'p bo'lmasin)
  const used = new Set(
    (await query<{ photo_path: string }>("SELECT photo_path FROM auth_sessions WHERE photo_path <> ''").catch(() => []))
      .map((r) => r.photo_path),
  );
  const users = await fsp.readdir(PHOTO_DIR).catch(() => [] as string[]);
  for (const u of users) {
    const dir = path.join(PHOTO_DIR, u);
    for (const f of await fsp.readdir(dir).catch(() => [] as string[])) {
      const rel = path.posix.join(u, f);
      if (used.has(rel)) continue;
      const st = await fsp.stat(path.join(dir, f)).catch(() => null);
      // faqat bir kundan oshgan "egasiz" fayllar (hozir yozilayotganiga tegmaymiz)
      if (st && Date.now() - st.mtimeMs > 24 * 60 * 60 * 1000) {
        await fsp.rm(path.join(dir, f), { force: true }).catch(() => undefined);
      }
    }
  }
}

/** Har 12 soatda eski yozuvlarni tozalash (ishga tushgandan 5 daqiqa keyin birinchi marta). */
export function startSessionCleanupJob(): void {
  const run = () => cleanupOldSessions().catch((e) => console.error("[sessions] tozalash xatosi:", e));
  setTimeout(run, 5 * 60 * 1000).unref();
  setInterval(run, 12 * 60 * 60 * 1000).unref();
}

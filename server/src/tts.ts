import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config.js";
import { one, query } from "./db.js";
import { absPath, publicUrl, relPath } from "./storage.js";

/**
 * "Imtihonchi ovozi": savollar Piper (neyron, oflayn) bilan oldindan MP3 ga aylantiriladi.
 * Bir xil matn — bir xil fayl (hash bo'yicha, foydalanuvchilar o'rtasida umumiy). Piper bo'lmasa —
 * hech narsa qilinmaydi, mijoz brauzer TTS'iga qaytadi.
 */

/** Test davomidagi doimiy iboralar (mijoz kalit bo'yicha so'raydi) */
export const PHRASES: Record<string, string> = {
  "finished:Part 1.1": "Part one point one is finished.",
  "finished:Part 1.2": "Part one point two is finished.",
  "finished:Part 2": "Part two is finished.",
  "finished:Part 3": "Part three is finished.",
  "part:Part 1.1": "Part one point one.",
  "part:Part 1.2": "Part one point two.",
  "part:Part 2": "Part two.",
  "part:Part 3": "Part three.",
  speak: "Please speak now.",
};

const modelPath = () => path.join(config.piperVoiceDir, `${config.piperVoice}.onnx`);

let enabledCache: boolean | null = null;
/** Piper binar va ovoz modeli mavjudmi (bir marta tekshiriladi). */
export function ttsEnabled(): boolean {
  if (enabledCache === null) {
    enabledCache = !!config.piperBin && fs.existsSync(config.piperBin) && fs.existsSync(modelPath());
  }
  return enabledCache;
}

const normalize = (t: string) => t.replace(/\s+/g, " ").trim();
export const ttsHash = (text: string) => crypto.createHash("sha1").update(`${config.piperVoice}\n${normalize(text)}`).digest("hex");

/** Faqat lotin yozuvidagi (inglizcha) matn — kirill/arab matnini ingliz ovozi bilan o'qib bo'lmaydi. */
export function ttsEligible(text: string): boolean {
  const t = normalize(text);
  if (t.length < 2 || t.length > 2000) return false;
  if (/[Ѐ-ӿ؀-ۿ]/.test(t)) return false;
  return /[A-Za-z]/.test(t);
}

// hash -> nisbiy yo'l (uploads/ ga nisbatan). Jadval kichik — to'liq xotirada.
const known = new Map<string, string>();
const pending = new Map<string, string>();
let pumping = false;
let loaded = false;

async function loadKnown(): Promise<void> {
  if (loaded) return;
  const rows = await query<{ hash: string; path: string; voice: string }>("SELECT hash, path, voice FROM tts_audio");
  for (const r of rows) if (r.voice === config.piperVoice) known.set(r.hash, r.path);
  loaded = true;
}

/** Matn uchun tayyor audio URL (bo'lmasa null). */
export function ttsUrl(text: string): string | null {
  if (!ttsEnabled() || !text) return null;
  const p = known.get(ttsHash(text));
  return p ? publicUrl(p) : null;
}

/** Matnlarni navbatga qo'yadi (tayyorlari o'tkazib yuboriladi) va fonda sintez qiladi. */
export function enqueueTts(texts: Array<string | null | undefined>): void {
  if (!ttsEnabled()) return;
  for (const raw of texts) {
    if (!raw || !ttsEligible(raw)) continue;
    const text = normalize(raw);
    const h = ttsHash(text);
    if (known.has(h) || pending.has(h)) continue;
    pending.set(h, text);
  }
  void pump();
}

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    await loadKnown();
    for (const [h, text] of pending) {
      pending.delete(h);
      if (known.has(h)) continue;
      try {
        const rel = await synthesize(text, h);
        known.set(h, rel);
      } catch (err) {
        console.error(`[tts] synth failed: ${text.slice(0, 60)}…`, err instanceof Error ? err.message : err);
      }
    }
  } finally {
    pumping = false;
  }
}

function run(cmd: string, args: string[], input?: string, timeoutMs = 120_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: [input !== undefined ? "pipe" : "ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr?.on("data", (d) => (err += String(d)));
    const timer = setTimeout(() => {
      p.kill("SIGKILL");
      reject(new Error(`${cmd} timeout`));
    }, timeoutMs);
    p.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    p.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exit ${code}: ${err.slice(0, 300)}`));
    });
    if (input !== undefined) {
      p.stdin?.end(input);
    }
  });
}

/** Piper -> WAV -> ffmpeg -> MP3 (mono, 64 kbps). Qaytadi: uploads/ ga nisbatan yo'l. */
async function synthesize(text: string, hash: string): Promise<string> {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "tts-"));
  const wav = path.join(tmpDir, "out.wav");
  const rel = relPath("tts", `${hash}.mp3`);
  const abs = absPath(rel);
  try {
    await run(config.piperBin, ["--model", modelPath(), "--output_file", wav, "--sentence_silence", "0.35"], `${text}\n`);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await run("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "64k", "-ar", "22050", "-ac", "1", "-f", "mp3", `${abs}.part`]);
    await fsp.rename(`${abs}.part`, abs);
    await query(
      `INSERT INTO tts_audio (hash, voice, text, path) VALUES ($1, $2, $3, $4)
       ON CONFLICT (hash) DO UPDATE SET voice = EXCLUDED.voice, text = EXCLUDED.text, path = EXCLUDED.path`,
      [hash, config.piperVoice, text, rel],
    );
    return rel;
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    await fsp.rm(`${abs}.part`, { force: true }).catch(() => undefined);
  }
}

/** Barcha savollar va doimiy iboralar uchun yetishmayotgan audiolarni navbatga qo'yadi. */
export async function ttsBackfill(): Promise<{ queued: number }> {
  if (!ttsEnabled()) return { queued: 0 };
  await loadKnown();
  const rows = await query<{ sub_questions: string[]; question_text: string }>("SELECT sub_questions, question_text FROM questions");
  const texts: string[] = [...Object.values(PHRASES)];
  for (const r of rows) {
    for (const s of r.sub_questions ?? []) texts.push(s);
    if (r.question_text) texts.push(r.question_text);
  }
  const before = pending.size;
  enqueueTts(texts);
  return { queued: pending.size - before };
}

/** Mavjud audiolarni o'chirib, hammasini qaytadan sintez qiladi (ovoz almashtirilganda). */
export async function ttsRebuildAll(): Promise<void> {
  if (!ttsEnabled()) return;
  await loadKnown();
  const rows = await query<{ path: string }>("SELECT path FROM tts_audio");
  for (const r of rows) await fsp.rm(absPath(r.path), { force: true }).catch(() => undefined);
  await query("DELETE FROM tts_audio");
  known.clear();
  await ttsBackfill();
}

/** Savolning barcha matnlari uchun URL'lar (mijozga qo'shib yuboriladi). */
export function ttsForQuestion(q: { sub_questions?: string[]; question_text?: string }) {
  if (!ttsEnabled()) return undefined;
  return {
    sub_questions: (q.sub_questions ?? []).map((s) => ttsUrl(s)),
    question_text: q.question_text ? ttsUrl(q.question_text) : null,
  };
}

/** Doimiy iboralar: kalit -> URL (yoki null) */
export function ttsPhrases(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, text] of Object.entries(PHRASES)) out[k] = ttsUrl(text);
  return out;
}

/** Ishga tushganda: xotirani yuklash, yetishmaganlarni fonda sintez qilish; har 15 daqiqada takror. */
export function startTtsWorker(): void {
  if (!ttsEnabled()) {
    console.log("[tts] Piper topilmadi — brauzer TTS ishlatiladi");
    return;
  }
  const tick = () => void ttsBackfill().then((r) => r.queued && console.log(`[tts] navbatga qo'shildi: ${r.queued}`)).catch((e) => console.error("[tts] backfill:", e));
  setTimeout(tick, 8000);
  setInterval(tick, 15 * 60 * 1000).unref();
}

export async function ttsStatus() {
  await loadKnown().catch(() => undefined);
  const row = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM tts_audio").catch(() => null);
  return { enabled: ttsEnabled(), voice: config.piperVoice, ready: row?.n ?? 0, pending: pending.size };
}

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import type { Readable } from "node:stream";
import { config } from "./config.js";
import { fileSignature } from "./file-urls.js";

export const UPLOADS_DIR = path.join(config.dataDir, "uploads");
/** Oqim bilan yuklanayotgan video bo'laklari (ommaviy /files/ dan tashqarida). */
export const CHUNKS_DIR = path.join(config.dataDir, "tmp", "chunks");

export async function ensureStorageDirs(): Promise<void> {
  await fsp.mkdir(path.join(UPLOADS_DIR, "images"), { recursive: true });
  await fsp.mkdir(path.join(UPLOADS_DIR, "videos"), { recursive: true });
  await fsp.mkdir(path.join(config.dataDir, "tmp"), { recursive: true });
  await fsp.mkdir(CHUNKS_DIR, { recursive: true });
}

/** uploads/ ga nisbatan xavfsiz relativ yo'l (URL uchun /files/<rel>). */
export function relPath(...segments: string[]): string {
  const rel = path.posix.join(...segments.map((s) => s.replace(/[^a-zA-Z0-9._-]/g, "_")));
  if (rel.includes("..")) throw new Error("Invalid path");
  return rel;
}

export function absPath(rel: string): string {
  const abs = path.resolve(UPLOADS_DIR, rel);
  if (!abs.startsWith(UPLOADS_DIR)) throw new Error("Invalid path");
  return abs;
}

export class FileTooLargeError extends Error {
  constructor(public readonly limit: number) {
    super(`File exceeds limit of ${limit} bytes`);
  }
}

/**
 * Oqimni diskka yozadi, limitdan oshsa to'xtatadi va faylni o'chiradi.
 * Qaytadi: yozilgan baytlar soni.
 */
export async function streamToFile(source: Readable, rel: string, limitBytes: number): Promise<number> {
  const target = absPath(rel);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.part`;

  let written = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      written += chunk.length;
      if (written > limitBytes) {
        cb(new FileTooLargeError(limitBytes));
        return;
      }
      cb(null, chunk);
    },
  });

  try {
    await pipeline(source, counter, fs.createWriteStream(tmp));
    await fsp.rename(tmp, target);
    return written;
  } catch (err) {
    await fsp.rm(tmp, { force: true }).catch(() => undefined);
    throw err;
  }
}

export async function removeFile(rel: string | null | undefined): Promise<void> {
  if (!rel) return;
  try {
    await fsp.rm(absPath(rel), { force: true });
  } catch {
    /* fayl allaqachon yo'q */
  }
}

/**
 * Faylning tashqi manzili. Shaxsiy fayllar (videolar, cheklar) imzo bilan beriladi —
 * imzosiz havola 403 qaytaradi (`file-urls.ts`).
 */
export function publicUrl(rel: string): string {
  return `/files/${rel}${fileSignature(rel)}`;
}

// ---------- Bo'lakli (streaming) yuklash ----------

const safeSeg = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

/** Foydalanuvchi + yozuv uchun bo'laklar papkasi (CHUNKS_DIR ichida). */
export function chunkDir(uid: string, localId: string): string {
  const dir = path.resolve(CHUNKS_DIR, safeSeg(uid), safeSeg(localId));
  if (!dir.startsWith(CHUNKS_DIR)) throw new Error("Invalid path");
  return dir;
}

/** Bitta bo'lakni diskka yozadi (limitdan oshsa FileTooLargeError). Qayta yuborilsa ustidan yozadi. */
export async function writeChunk(uid: string, localId: string, seq: number, source: Readable, limitBytes: number): Promise<number> {
  const dir = chunkDir(uid, localId);
  await fsp.mkdir(dir, { recursive: true });
  const target = path.join(dir, `${seq}.bin`);
  const tmp = `${target}.part`;

  let written = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      written += chunk.length;
      if (written > limitBytes) {
        cb(new FileTooLargeError(limitBytes));
        return;
      }
      cb(null, chunk);
    },
  });

  try {
    await pipeline(source, counter, fs.createWriteStream(tmp));
    await fsp.rename(tmp, target);
    return written;
  } catch (err) {
    await fsp.rm(tmp, { force: true }).catch(() => undefined);
    throw err;
  }
}

/** Mavjud bo'laklar (tartib raqamlari) va ularning umumiy hajmi. */
export async function listChunks(uid: string, localId: string): Promise<{ seqs: number[]; bytes: number }> {
  const dir = chunkDir(uid, localId);
  let names: string[] = [];
  try {
    names = await fsp.readdir(dir);
  } catch {
    return { seqs: [], bytes: 0 };
  }
  const seqs: number[] = [];
  let bytes = 0;
  for (const name of names) {
    const m = /^(\d+)\.bin$/.exec(name);
    if (!m) continue;
    const st = await fsp.stat(path.join(dir, name)).catch(() => null);
    if (!st) continue;
    seqs.push(Number(m[1]));
    bytes += st.size;
  }
  seqs.sort((a, b) => a - b);
  return { seqs, bytes };
}

/**
 * 0..count-1 bo'laklarni tartib bilan bitta faylga (uploads/<rel>) birlashtiradi.
 * Qaytadi: yozilgan baytlar. Biror bo'lak yo'q bo'lsa — xato.
 */
export async function assembleChunks(uid: string, localId: string, count: number, rel: string, limitBytes: number): Promise<number> {
  const dir = chunkDir(uid, localId);
  const target = absPath(rel);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.part`;
  const out = fs.createWriteStream(tmp);
  let written = 0;
  try {
    for (let i = 0; i < count; i++) {
      const part = path.join(dir, `${i}.bin`);
      const st = await fsp.stat(part);
      written += st.size;
      if (written > limitBytes) throw new FileTooLargeError(limitBytes);
      await new Promise<void>((resolve, reject) => {
        const rs = fs.createReadStream(part);
        rs.on("error", reject);
        rs.on("end", resolve);
        out.on("error", reject);
        rs.pipe(out, { end: false });
      });
    }
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
    await fsp.rename(tmp, target);
    return written;
  } catch (err) {
    out.destroy();
    await fsp.rm(tmp, { force: true }).catch(() => undefined);
    throw err;
  }
}

export async function removeChunkDir(uid: string, localId: string): Promise<void> {
  await fsp.rm(chunkDir(uid, localId), { recursive: true, force: true }).catch(() => undefined);
}

/** Tugallanmagan (eski) bo'lak papkalarini o'chiradi. Qaytadi: o'chirilganlar soni. */
export async function cleanupStaleChunks(maxAgeMs: number): Promise<number> {
  let removed = 0;
  const cutoff = Date.now() - maxAgeMs;
  let users: string[] = [];
  try {
    users = await fsp.readdir(CHUNKS_DIR);
  } catch {
    return 0;
  }
  for (const u of users) {
    const udir = path.join(CHUNKS_DIR, u);
    const recs = await fsp.readdir(udir).catch(() => [] as string[]);
    for (const r of recs) {
      const rdir = path.join(udir, r);
      const st = await fsp.stat(rdir).catch(() => null);
      if (!st?.isDirectory()) continue;
      // papka ichidagi eng yangi fayl vaqti bo'yicha
      let newest = st.mtimeMs;
      for (const f of await fsp.readdir(rdir).catch(() => [] as string[])) {
        const fst = await fsp.stat(path.join(rdir, f)).catch(() => null);
        if (fst && fst.mtimeMs > newest) newest = fst.mtimeMs;
      }
      if (newest < cutoff) {
        await fsp.rm(rdir, { recursive: true, force: true }).catch(() => undefined);
        removed++;
      }
    }
    const left = await fsp.readdir(udir).catch(() => ["x"]);
    if (left.length === 0) await fsp.rmdir(udir).catch(() => undefined);
  }
  return removed;
}

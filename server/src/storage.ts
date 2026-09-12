import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import type { Readable } from "node:stream";
import { config } from "./config.js";

export const UPLOADS_DIR = path.join(config.dataDir, "uploads");

export async function ensureStorageDirs(): Promise<void> {
  await fsp.mkdir(path.join(UPLOADS_DIR, "images"), { recursive: true });
  await fsp.mkdir(path.join(UPLOADS_DIR, "videos"), { recursive: true });
  await fsp.mkdir(path.join(config.dataDir, "tmp"), { recursive: true });
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

export function publicUrl(rel: string): string {
  return `/files/${rel}`;
}

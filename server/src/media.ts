import { spawn } from "node:child_process";
import fsp from "node:fs/promises";

let ffmpegAvailable: boolean | null = null;

/** Tizimda ffmpeg bormi (bir marta tekshiriladi). */
export async function hasFfmpeg(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  ffmpegAvailable = await new Promise<boolean>((resolve) => {
    try {
      const p = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
      p.on("error", () => resolve(false));
      p.on("exit", (code) => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
  return ffmpegAvailable;
}

/**
 * MediaRecorder'dan kelgan WebM'ga davomiylik va cues yozadi (qayta kodlashsiz, `-c copy`).
 * Shunda pleyerda vaqt chizig'i va oldinga surish to'g'ri ishlaydi.
 * Muvaffaqiyatsiz bo'lsa asl fayl o'zgarishsiz qoladi.
 */
export async function remuxWebm(absIn: string, timeoutMs = 120_000): Promise<boolean> {
  if (!(await hasFfmpeg())) return false;
  const out = `${absIn}.remux.webm`;
  const ok = await new Promise<boolean>((resolve) => {
    const p = spawn("ffmpeg", ["-y", "-loglevel", "error", "-i", absIn, "-c", "copy", out], { stdio: "ignore" });
    const timer = setTimeout(() => {
      p.kill("SIGKILL");
      resolve(false);
    }, timeoutMs);
    p.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    p.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
  if (!ok) {
    await fsp.rm(out, { force: true }).catch(() => undefined);
    return false;
  }
  const st = await fsp.stat(out).catch(() => null);
  if (!st || st.size === 0) {
    await fsp.rm(out, { force: true }).catch(() => undefined);
    return false;
  }
  await fsp.rename(out, absIn);
  return true;
}

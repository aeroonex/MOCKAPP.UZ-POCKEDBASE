/**
 * Imtihon kompozitori: kamera tasviri + savol matni/rasmi + taymer bitta canvas'ga chiziladi
 * va `canvas.captureStream()` orqali video oqimi sifatida yozib olinadi.
 * Ekran ulashish (getDisplayMedia) kerak emas — o'lcham va bitrate to'liq nazoratda.
 */

export interface OverlayState {
  part: string; // "Part 2"
  partIndex: number; // 0..3
  phase: string; // TestPhase
  phaseLabel: string; // "Javob", "Tayyorgarlik", ...
  questionLabel: string; // "Savol 1"
  question: string;
  images: string[];
  countdown: number;
  initialCountdown: number;
  student?: { id: string; name: string; phone: string } | null;
  brand?: string;
}

export interface CompositorOptions {
  width?: number;
  height?: number;
  fps?: number;
}

const FONT = "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const RTL_RE = /[֐-׿؀-ۿݐ-ݿ]/;

const pad2 = (n: number) => n.toString().padStart(2, "0");
const fmtClock = (s: number) => `${Math.floor(s / 60)}:${pad2(s % 60)}`;

export class ExamCompositor {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;
  private readonly fps: number;
  private video: HTMLVideoElement | null = null;
  private timer: number | null = null;
  private startedAt = 0;
  private state: OverlayState | null = null;
  private images = new Map<string, HTMLImageElement | null>();
  private noCameraText = "Kamera yo'q";

  constructor(opts: CompositorOptions = {}) {
    this.width = opts.width ?? 960;
    this.height = opts.height ?? 540;
    this.fps = opts.fps ?? 15;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D context is not available");
    this.ctx = ctx;
  }

  /** Kamera oqimini ulash (null — kamerasiz, o'rniga belgi chiziladi). */
  attachCamera(stream: MediaStream | null, noCameraText?: string) {
    if (noCameraText) this.noCameraText = noCameraText;
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    if (!stream || stream.getVideoTracks().length === 0) return;
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
    v.srcObject = stream;
    v.play().catch(() => undefined);
    this.video = v;
  }

  setState(state: OverlayState) {
    this.state = state;
    for (const url of state.images ?? []) this.preload(url);
  }

  /** Chizishni boshlaydi va yozib olinadigan video oqimini qaytaradi. */
  start(): MediaStream {
    this.startedAt = Date.now();
    this.draw();
    this.timer = window.setInterval(() => this.draw(), Math.round(1000 / this.fps));
    return this.canvas.captureStream(this.fps);
  }

  stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
  }

  private preload(url: string) {
    if (!url || this.images.has(url)) return;
    this.images.set(url, null);
    const img = new Image();
    img.crossOrigin = "anonymous"; // chet manzil rasmi canvas'ni ifloslamasin (aks holda yozuv buziladi)
    img.decoding = "async";
    img.onload = () => this.images.set(url, img);
    img.onerror = () => this.images.delete(url);
    img.src = url;
  }

  // ---------- chizish ----------

  private draw() {
    const { ctx, width: W, height: H } = this;
    const s = this.state;

    // fon
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, W, H);

    const pad = 20;
    const headerH = 40;
    const footerH = 34;
    const camX = pad;
    const camY = headerH + 8;
    const camW = 600;
    const camH = H - headerH - footerH - 16;
    const panelX = camX + camW + 22;
    const panelW = W - panelX - pad;

    this.drawHeader(headerH);
    this.drawCamera(camX, camY, camW, camH);
    if (s) this.drawPanel(s, panelX, camY, panelW, camH);
    this.drawFooter(H - footerH, footerH);
  }

  private drawHeader(h: number) {
    const { ctx, width: W } = this;
    const y = h / 2;
    // REC (miltillaydi)
    const on = Math.floor(Date.now() / 600) % 2 === 0;
    ctx.beginPath();
    ctx.arc(30, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = on ? "#ef4444" : "#7f1d1d";
    ctx.fill();
    ctx.font = `800 13px ${FONT}`;
    ctx.fillStyle = "#fca5a5";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("REC", 42, y);
    // o'tgan vaqt
    const elapsed = Math.max(0, Math.floor((Date.now() - this.startedAt) / 1000));
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(fmtClock(elapsed), 84, y);
    // brend va sana
    ctx.textAlign = "right";
    ctx.font = `800 14px ${FONT}`;
    ctx.fillStyle = "#e2e8f0";
    const brand = this.state?.brand || "edumock.uz";
    ctx.fillText(brand, W - 20, y);
    const bw = ctx.measureText(brand).width;
    ctx.font = `500 12px ${FONT}`;
    ctx.fillStyle = "#64748b";
    const now = new Date();
    const stamp = `${pad2(now.getDate())}.${pad2(now.getMonth() + 1)}.${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    ctx.fillText(stamp, W - 20 - bw - 16, y);
    // ajratuvchi chiziq
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, h, W, 1);
  }

  private drawCamera(x: number, y: number, w: number, h: number) {
    const { ctx } = this;
    ctx.fillStyle = "#020617";
    ctx.fillRect(x, y, w, h);
    const v = this.video;
    if (v && v.readyState >= 2 && v.videoWidth > 0) {
      // cover: kadrni qirqib to'ldirish
      const scale = Math.max(w / v.videoWidth, h / v.videoHeight);
      const sw = w / scale;
      const sh = h / scale;
      const sx = (v.videoWidth - sw) / 2;
      const sy = (v.videoHeight - sh) / 2;
      ctx.drawImage(v, sx, sy, sw, sh, x, y, w, h);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2 - 20, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `600 16px ${FONT}`;
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.noCameraText, x + w / 2, y + h / 2 + 40);
    }
    // ramka
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private drawPanel(s: OverlayState, x: number, y: number, w: number, h: number) {
    const { ctx } = this;
    ctx.textBaseline = "alphabetic";

    // qism va savol raqami
    ctx.textAlign = "left";
    ctx.font = `800 13px ${FONT}`;
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(s.part.toUpperCase(), x, y + 18);
    const pw = ctx.measureText(s.part.toUpperCase()).width;
    ctx.fillStyle = "#64748b";
    ctx.fillText(s.questionLabel.toUpperCase(), x + pw + 10, y + 18);

    // qismlar progressi (4 segment)
    const segW = (w - 3 * 6) / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i < s.partIndex ? "#0369a1" : i === s.partIndex ? "#38bdf8" : "#1e293b";
      ctx.fillRect(x + i * (segW + 6), y + 30, segW, 4);
    }

    // bosqich + taymer
    const timerY = y + 82;
    const speaking = s.phase === "speaking";
    const low = s.countdown <= 10 && s.initialCountdown > 15 && (speaking || s.phase === "preparation");
    ctx.font = `800 13px ${FONT}`;
    ctx.fillStyle = speaking ? "#fca5a5" : "#94a3b8";
    ctx.fillText(s.phaseLabel.toUpperCase(), x, timerY);
    ctx.textAlign = "right";
    ctx.font = `900 40px ${FONT}`;
    ctx.fillStyle = low ? "#ef4444" : "#f8fafc";
    ctx.fillText(fmtClock(Math.max(0, s.countdown)), x + w, timerY + 8);
    // progress chizig'i
    const barY = timerY + 22;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x, barY, w, 6);
    const ratio = s.initialCountdown > 0 ? Math.max(0, Math.min(1, s.countdown / s.initialCountdown)) : 0;
    ctx.fillStyle = low ? "#ef4444" : speaking ? "#bef264" : "#38bdf8";
    ctx.fillRect(x, barY, w * ratio, 6);

    // savol matni
    const textTop = barY + 34;
    const rtl = RTL_RE.test(s.question);
    ctx.textAlign = rtl ? "right" : "left";
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.font = `600 20px ${FONT}`;
    ctx.fillStyle = "#f1f5f9";
    const lineH = 27;
    const hasImage = s.images.length > 0;
    const maxLines = hasImage ? 5 : Math.floor((y + h - textTop) / lineH);
    const lines = wrapText(ctx, s.question, w, maxLines);
    lines.forEach((ln, i) => ctx.fillText(ln, rtl ? x + w : x, textTop + i * lineH));
    ctx.direction = "ltr";

    // rasm (bo'lsa) — matn ostida, qolgan joyga sig'diriladi
    if (hasImage) {
      const top = textTop + lines.length * lineH + 8;
      const avail = y + h - top;
      if (avail > 60) {
        const n = Math.min(2, s.images.length);
        const gap = 8;
        const boxW = (w - (n - 1) * gap) / n;
        for (let i = 0; i < n; i++) {
          const img = this.images.get(s.images[i]);
          const bx = x + i * (boxW + gap);
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(bx, top, boxW, avail);
          if (img && img.naturalWidth > 0) {
            const sc = Math.min(boxW / img.naturalWidth, avail / img.naturalHeight);
            const dw = img.naturalWidth * sc;
            const dh = img.naturalHeight * sc;
            ctx.drawImage(img, bx + (boxW - dw) / 2, top + (avail - dh) / 2, dw, dh);
          }
        }
      }
    }
  }

  private drawFooter(y: number, h: number) {
    const { ctx, width: W } = this;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, y, W, 1);
    const st = this.state?.student;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = "#cbd5e1";
    const parts = st ? [st.name, st.id ? `ID ${st.id}` : "", st.phone].filter(Boolean) : [];
    ctx.fillText(parts.join("  ·  "), 20, y + h / 2);
  }
}

/** Matnni bo'shliqlar bo'yicha qatorlarga bo'ladi; sig'masa oxirgi qatorga "…" qo'yadi. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !cur) {
      cur = test;
    } else {
      lines.push(cur);
      cur = word;
    }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && (cur || words.length)) {
    // matn qolgan bo'lsa — oxirgi qatorni qisqartirish
    const joined = lines.join(" ");
    if (joined.length < text.trim().length) {
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

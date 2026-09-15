import { api, auth } from "@/lib/api";
import { acquireMedia, releaseMedia } from "@/lib/media-devices";
import i18n from "@/i18n";

/**
 * Kirishdan keyingi ochiq kamera tekshiruvi: kamera qisqa yonadi, bitta kadr olinadi,
 * "Kamera tekshirildi" deyiladi va kamera o'chadi. Kadr sessiyaga biriktirilib admin panelga boradi.
 * Kamera bo'lmasa yoki rad etilsa — jimgina o'tkazib yuboriladi (kirishga to'sqinlik qilmaydi).
 * React'dan mustaqil: o'z DOM qatlamini boshqaradi, sahifa almashsa ham uzilmaydi.
 */

let running = false;

export function runCameraCheck(): void {
  if (running || typeof window === "undefined" || typeof document === "undefined") return;
  if (!navigator.mediaDevices?.getUserMedia) return;
  if (!auth.token) return;
  running = true;
  void doCheck().finally(() => (running = false));
}

const t = (k: string) => i18n.t(k);

async function doCheck(): Promise<void> {
  const card = mountCard();
  let stream: MediaStream | null = null;
  try {
    // Umumiy kamera oqimi (media-devices) — imtihon sahifasi bilan to'qnashmaydi
    stream = await acquireMedia("camera");
    if (!stream) throw new Error("no-camera");
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play().catch(() => undefined);
    // kadr barqarorlashishi uchun qisqa kutish
    await waitFrame(video);
    const blob = await grabJpeg(video);
    if (blob) await api.postBlob("/api/auth/login-photo", blob).catch(() => undefined);
    setDone(card, true);
  } catch {
    // ruxsat berilmadi / kamera yo'q — belgini olib tashlaymiz
    setDone(card, false);
  } finally {
    releaseMedia("camera", stream);
  }
}

function waitFrame(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    let tries = 0;
    const check = () => {
      if (video.readyState >= 2 && video.videoWidth > 0) return resolve();
      if (++tries > 40) return resolve();
      setTimeout(check, 50);
    };
    check();
  });
}

async function grabJpeg(video: HTMLVideoElement): Promise<Blob | null> {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82));
}

// ---------- kichik DOM qatlami ----------

function mountCard(): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.style.cssText = [
    "position:fixed", "z-index:2147483000", "top:16px", "right:16px",
    "display:flex", "align-items:center", "gap:10px",
    "padding:10px 14px", "border-radius:12px",
    "background:rgba(15,23,42,0.92)", "color:#fff",
    "font:600 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
    "box-shadow:0 12px 30px -10px rgba(0,0,0,0.6)",
    "backdrop-filter:blur(6px)", "transition:opacity .4s ease, transform .4s ease",
    "opacity:0", "transform:translateY(-8px)",
  ].join(";");
  el.innerHTML =
    '<span class="ec-spin" style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#38bdf8;border-radius:50%;display:inline-block;animation:ec-spin 0.7s linear infinite"></span>' +
    `<span class="ec-text">${escapeHtml(t("camera_check.checking"))}</span>`;
  if (!document.getElementById("ec-style")) {
    const st = document.createElement("style");
    st.id = "ec-style";
    st.textContent = "@keyframes ec-spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(st);
  }
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  });
  return el;
}

function setDone(el: HTMLElement, ok: boolean): void {
  const spin = el.querySelector<HTMLElement>(".ec-spin");
  const text = el.querySelector<HTMLElement>(".ec-text");
  if (ok && spin && text) {
    spin.outerHTML = '<span style="color:#4ade80;font-size:16px">✓</span>';
    text.textContent = t("camera_check.done");
  }
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-8px)";
    setTimeout(() => el.remove(), 450);
  }, ok ? 1400 : 200);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c);
}

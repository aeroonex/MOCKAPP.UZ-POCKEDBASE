import { auth } from "@/lib/api";
import { getPendingLocalRecordings, uploadRecordingToCloud } from "@/lib/local-db";
import { hasProgress, removeProgress, setProgress } from "@/utils/uploadProgress";
import { recorderState } from "@/lib/recorder-state";
import i18n from "@/i18n";

/**
 * Serverga yuklanmay qolgan lokal yozuvlarni fonda avtomatik yuklaydi:
 * ilova ochilganda, tizimga kirilganda, internet qaytganda va har 2 daqiqada tekshiradi.
 * Test yozib olinayotgan paytda ishlamaydi (tarmoqni band qilmaslik uchun).
 */

const PERIOD_MS = 2 * 60 * 1000;
const RETRY_AFTER_FAIL_MS = 5 * 60 * 1000;

let started = false;
let running = false;
let lastFailAt = 0;
let timer: number | null = null;

export function startPendingUploadWatcher() {
  if (started || typeof window === "undefined") return;
  started = true;

  const kick = (delay: number) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => void runPendingUploads(), delay);
  };

  window.addEventListener("online", () => kick(2000));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") kick(1500);
  });
  auth.onChange((token) => {
    if (token) kick(3000);
  });
  window.setInterval(() => kick(0), PERIOD_MS);
  kick(4000);
}

export async function runPendingUploads(): Promise<void> {
  if (running) return;
  if (!auth.token || !auth.model) return;
  if (!navigator.onLine) return;
  if (recorderState.isRecording) return;
  if (Date.now() - lastFailAt < RETRY_AFTER_FAIL_MS) return;

  running = true;
  try {
    const pending = (await getPendingLocalRecordings()).filter((r) => !hasProgress(r.id));
    if (!pending.length) return;

    const { toast } = await import("sonner");
    const toastId = toast.loading(i18n.t("records_page.pending_upload_started", { n: pending.length }));
    let ok = 0;
    for (let i = 0; i < pending.length; i++) {
      const rec = pending[i];
      if (!navigator.onLine || recorderState.isRecording) break;
      setProgress(rec.id, 0);
      try {
        await uploadRecordingToCloud(rec.id, (loaded, total) => {
          const pct = total ? Math.round((loaded / total) * 100) : 0;
          setProgress(rec.id, pct);
          toast.loading(i18n.t("records_page.pending_upload_progress", { i: i + 1, n: pending.length, percent: pct }), { id: toastId });
        });
        ok++;
      } catch (e) {
        console.warn("[upload-queue] failed:", rec.id, e);
        lastFailAt = Date.now();
        break;
      } finally {
        removeProgress(rec.id);
      }
    }
    if (ok === pending.length) {
      toast.success(i18n.t("records_page.pending_upload_done", { n: ok }), { id: toastId, duration: 6000 });
    } else {
      toast.error(i18n.t("records_page.pending_upload_failed", { ok, n: pending.length }), { id: toastId, duration: 8000 });
    }
  } finally {
    running = false;
  }
}

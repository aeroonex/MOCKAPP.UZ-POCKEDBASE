import { api, auth, ApiError } from "@/lib/api";

/**
 * Yozuv bo'laklarini test DAVOMIDA serverga navbat bilan yuboradi (5 soniyalik bo'laklar).
 * Uzilishda qayta urinadi; yakunda `finalize` bo'laklarni serverda birlashtiradi.
 * Brauzer qotsa ham shu paytgacha yuborilgan qism serverda qoladi.
 */

export interface FinalizeMeta {
  timestamp: string;
  duration: number;
  student_id?: string;
  student_name?: string;
  student_phone?: string;
  registration_id?: string;
  attempt?: number;
  mime: string;
}

export interface FinalizedRecording {
  id: string;
  local_id: string;
  video_url?: string;
  size_bytes?: number;
}

const MAX_BACKOFF_MS = 15_000;

export class ChunkUploader {
  readonly localId: string;
  private queue: { seq: number; blob: Blob }[] = [];
  private pumping = false;
  private aborted = false;
  private sentBytes = 0;
  private totalBytes = 0;
  private nextSeq = 0;
  private failures = 0;
  private drainWaiters: (() => void)[] = [];
  onProgress?: (sentBytes: number, totalBytes: number) => void;

  constructor(localId: string) {
    this.localId = localId;
  }

  /** Foydalanuvchi tizimga kirgan bo'lsa oqim bilan yuklash mumkin. */
  static available(): boolean {
    return !!auth.token && !!auth.model;
  }

  get pendingBytes() {
    return this.totalBytes - this.sentBytes;
  }

  get chunkCount() {
    return this.nextSeq;
  }

  push(blob: Blob) {
    if (this.aborted || blob.size === 0) return;
    this.queue.push({ seq: this.nextSeq++, blob });
    this.totalBytes += blob.size;
    void this.pump();
  }

  abort() {
    this.aborted = true;
    this.queue = [];
    this.wakeDrainWaiters();
  }

  /** Navbat bo'shaguncha kutadi (timeout bilan). Qaytadi: hammasi yuborildimi. */
  async drain(timeoutMs: number): Promise<boolean> {
    if (!this.queue.length && !this.pumping) return true;
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.drainWaiters = this.drainWaiters.filter((w) => w !== wake);
        resolve(!this.queue.length && !this.pumping);
      }, timeoutMs);
      const wake = () => {
        clearTimeout(timer);
        resolve(!this.queue.length && !this.pumping);
      };
      this.drainWaiters.push(wake);
    });
  }

  /** Bo'laklarni serverda birlashtirib, yozuv qatorini yaratadi. Yetishmagan bo'laklar bo'lsa xato. */
  async finalize(meta: FinalizeMeta): Promise<FinalizedRecording> {
    const body = { ...meta, chunks: this.nextSeq, size_bytes: this.totalBytes };
    try {
      return await api.post<FinalizedRecording>(`/api/recordings/${encodeURIComponent(this.localId)}/finalize`, body);
    } catch (e) {
      // Server yetishmagan bo'laklarni aytadi — bu holda to'liq fayl bilan zaxira yo'li ishlatiladi
      if (e instanceof ApiError && e.status === 409) throw new Error("chunks-missing");
      throw e;
    }
  }

  private wakeDrainWaiters() {
    const ws = this.drainWaiters;
    this.drainWaiters = [];
    ws.forEach((w) => w());
  }

  private async pump() {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.queue.length && !this.aborted) {
        const item = this.queue[0];
        try {
          await api.putBlob(`/api/recordings/${encodeURIComponent(this.localId)}/chunks/${item.seq}`, item.blob);
          this.queue.shift();
          this.sentBytes += item.blob.size;
          this.failures = 0;
          this.onProgress?.(this.sentBytes, this.totalBytes);
        } catch (e) {
          // 4xx (413 kvota, 401 va h.k.) — qayta urinishdan foyda yo'q, oqimni to'xtatamiz
          if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429) {
            this.aborted = true;
            this.queue = [];
            break;
          }
          this.failures++;
          const wait = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(this.failures, 4));
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    } finally {
      this.pumping = false;
      this.wakeDrainWaiters();
    }
  }
}

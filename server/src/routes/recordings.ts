import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { one, query, withTransaction } from "../db.js";
import { requireAuth, requireFullAuth, userId } from "../auth.js";
import { config } from "../config.js";
import type { Readable } from "node:stream";
import fsp from "node:fs/promises";
import {
  FileTooLargeError, absPath, assembleChunks, cleanupStaleChunks, listChunks, publicUrl, relPath, removeChunkDir, removeFile, streamToFile, writeChunk,
} from "../storage.js";
import { remuxWebm } from "../media.js";
import { integritySummaryHtml, parseIntegrity, type IntegrityEvent } from "../integrity.js";
import { backupRecordingToTelegram } from "../bot.js";

interface RecordingRow {
  id: string;
  local_id: string;
  user_id: string;
  timestamp: Date;
  duration: number;
  student_id: string;
  student_name: string;
  student_phone: string;
  video_path: string | null;
  size_bytes: number;
  cloud_url: string;
  registration_id: string | null;
  attempt: number | null;
  tg_backup_at: Date | null;
  video_deleted_at: Date | null;
  integrity: IntegrityEvent[];
  created: Date;
  updated: Date;
}

const COLS = `id, local_id, user_id, "timestamp", duration, student_id, student_name, student_phone,
  video_path, size_bytes, cloud_url, registration_id, attempt, tg_backup_at, video_deleted_at, integrity, created, updated`;

function toClient(r: RecordingRow) {
  const video_url = r.video_path ? publicUrl(r.video_path) : r.cloud_url || "";
  return {
    id: r.id,
    local_id: r.local_id,
    user_id: r.user_id,
    timestamp: r.timestamp,
    duration: Number(r.duration),
    student_id: r.student_id,
    student_name: r.student_name,
    student_phone: r.student_phone,
    size_bytes: Number(r.size_bytes),
    video_url,
    cloud_url: video_url,
    registration_id: r.registration_id,
    attempt: r.attempt === null ? null : Number(r.attempt),
    tg_backup_at: r.tg_backup_at,
    video_deleted_at: r.video_deleted_at,
    integrity: Array.isArray(r.integrity) ? r.integrity : [],
    created: r.created,
    updated: r.updated,
  };
}

/** registration_id faqat shu foydalanuvchining arizasiga ishora qilishi mumkin; aks holda null. */
async function ownRegistrationId(uid: string, id: string | undefined): Promise<string | null> {
  if (!id) return null;
  const row = await one<{ id: string }>("SELECT id FROM registrations WHERE id = $1 AND user_id = $2", [id, uid]);
  return row?.id ?? null;
}

const metaSchema = z.object({
  local_id: z.string().trim().min(1).max(64),
  timestamp: z.coerce.date().optional(),
  duration: z.coerce.number().int().min(0).max(86400).optional(),
  student_id: z.string().trim().max(80).optional(),
  student_name: z.string().trim().max(200).optional(),
  student_phone: z.string().trim().max(50).optional(),
  registration_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  attempt: z.coerce.number().int().min(1).max(99).optional(),
  // multipart'da JSON matn, finalize'da massiv — parseIntegrity ikkalasini ham tekshiradi
  integrity: z.unknown().optional(),
});

type RecordingMeta = z.infer<typeof metaSchema>;

/** Bitta bo'lak uchun maksimal hajm (5 soniyalik yozuv odatda 0.3–1 MB). */
const CHUNK_LIMIT_BYTES = 32 * 1024 * 1024;
/** Tugallanmagan bo'laklar shu vaqtdan keyin o'chiriladi. */
const STALE_CHUNKS_MS = 24 * 60 * 60 * 1000;

/**
 * Yozuv qatorini kvota nazorati bilan saqlaydi (yaratadi yoki yangilaydi), eski videoni o'chiradi,
 * foydalanuvchi hajmini qayta hisoblaydi va Telegram zaxirasini ishga tushiradi.
 */
async function saveRecording(uid: string, m: RecordingMeta, videoRel: string, size: number): Promise<RecordingRow> {
  const row = await withTransaction(async (client) => {
    const locked = await one<{ storage_limit_bytes: number }>(
      "SELECT storage_limit_bytes FROM users WHERE id = $1 FOR UPDATE",
      [uid],
      client,
    );
    const prev = await one<{ video_path: string | null; size_bytes: number }>(
      "SELECT video_path, size_bytes FROM recordings WHERE local_id = $1 AND user_id = $2",
      [m.local_id, uid],
      client,
    );
    const usedRow = await one<{ used: number }>(
      "SELECT COALESCE(SUM(size_bytes), 0)::bigint AS used FROM recordings WHERE user_id = $1",
      [uid],
      client,
    );
    const usedWithoutThis = Number(usedRow?.used ?? 0) - Number(prev?.size_bytes ?? 0);
    if (usedWithoutThis + size > Number(locked?.storage_limit_bytes ?? 0)) {
      throw new FileTooLargeError(Number(locked?.storage_limit_bytes ?? 0));
    }

    const regId = await ownRegistrationId(uid, m.registration_id);
    const integrity = parseIntegrity(m.integrity);
    const saved = await one<RecordingRow>(
      `INSERT INTO recordings (local_id, user_id, "timestamp", duration, student_id, student_name, student_phone, video_path, size_bytes, registration_id, attempt, integrity)
       VALUES ($1, $2, COALESCE($3, now()), COALESCE($4, 0), COALESCE($5, ''), COALESCE($6, ''), COALESCE($7, ''), $8, $9, $10, $11, $12::jsonb)
       ON CONFLICT (local_id, user_id) DO UPDATE SET
         "timestamp" = COALESCE(EXCLUDED."timestamp", recordings."timestamp"),
         duration = COALESCE(EXCLUDED.duration, recordings.duration),
         student_id = COALESCE(NULLIF(EXCLUDED.student_id, ''), recordings.student_id),
         student_name = COALESCE(NULLIF(EXCLUDED.student_name, ''), recordings.student_name),
         student_phone = COALESCE(NULLIF(EXCLUDED.student_phone, ''), recordings.student_phone),
         video_path = EXCLUDED.video_path,
         size_bytes = EXCLUDED.size_bytes,
         registration_id = COALESCE(EXCLUDED.registration_id, recordings.registration_id),
         attempt = COALESCE(EXCLUDED.attempt, recordings.attempt),
         integrity = CASE WHEN jsonb_array_length(EXCLUDED.integrity) > 0 THEN EXCLUDED.integrity ELSE recordings.integrity END,
         tg_backup_at = NULL, tg_backup_error = '', video_deleted_at = NULL
       RETURNING ${COLS}`,
      [m.local_id, uid, m.timestamp ?? null, m.duration ?? null, m.student_id ?? null, m.student_name ?? null, m.student_phone ?? null, videoRel, size, regId, m.attempt ?? null, JSON.stringify(integrity)],
      client,
    );
    if (prev?.video_path && prev.video_path !== videoRel) await removeFile(prev.video_path);
    await recalcUsage(uid, client);
    return saved!;
  });
  // Admin panel ulangan bo'lsa — videoni Telegram'ga zaxiralash (javobni kutmasdan)
  void backupRecordingToTelegram({ ...row, duration: Number(row.duration), size_bytes: Number(row.size_bytes), attempt: row.attempt === null ? null : Number(row.attempt) });
  return row;
}

/** users.storage_used_bytes ni recordings jadvalidan qayta hisoblaydi. */
async function recalcUsage(uid: string, client = undefined as Parameters<typeof query>[2]) {
  const row = await one<{ used: number }>(
    "SELECT COALESCE(SUM(size_bytes), 0)::bigint AS used FROM recordings WHERE user_id = $1",
    [uid],
    client,
  );
  const used = Number(row?.used ?? 0);
  await query("UPDATE users SET storage_used_bytes = $2 WHERE id = $1", [uid, used], client);
  return used;
}

export async function recordingRoutes(app: FastifyInstance) {
  app.get("/api/recordings", { preHandler: requireAuth }, async (req) => {
    const rows = await query<RecordingRow>(
      `SELECT ${COLS} FROM recordings WHERE user_id = $1 ORDER BY "timestamp" DESC`,
      [userId(req)],
    );
    return rows.map(toClient);
  });

  app.get("/api/recordings/:localId", { preHandler: requireAuth }, async (req, reply) => {
    const { localId } = req.params as { localId: string };
    const row = await one<RecordingRow>(`SELECT ${COLS} FROM recordings WHERE local_id = $1 AND user_id = $2`, [
      localId,
      userId(req),
    ]);
    return row ? toClient(row) : reply.code(404).send({ code: 404, message: "Not found" });
  });

  // Xotira holati
  app.get("/api/storage", { preHandler: requireAuth }, async (req) => {
    const uid = userId(req);
    const used = await recalcUsage(uid);
    const u = await one<{ storage_limit_bytes: number }>("SELECT storage_limit_bytes FROM users WHERE id = $1", [uid]);
    return { used_bytes: used, limit_bytes: Number(u?.storage_limit_bytes ?? 0) };
  });

  // Video yuklash (multipart). Maydonlar fayldan OLDIN yuborilishi kerak.
  app.post(
    "/api/recordings",
    { preHandler: requireAuth, bodyLimit: config.maxVideoBytes + 1024 * 1024 },
    async (req, reply) => {
      const uid = userId(req);
      const fields: Record<string, string> = {};
      let videoRel: string | null = null;
      let size = 0;

      const user = await one<{ storage_limit_bytes: number; storage_used_bytes: number }>(
        "SELECT storage_limit_bytes, storage_used_bytes FROM users WHERE id = $1",
        [uid],
      );
      if (!user) return reply.code(401).send({ code: 401, message: "Unauthorized" });

      const parts = req.parts({ limits: { fileSize: config.maxVideoBytes } });
      try {
        for await (const part of parts) {
          if (part.type !== "file") {
            fields[part.fieldname] = String(part.value ?? "");
            continue;
          }
          if (part.fieldname !== "video") {
            part.file.resume();
            continue;
          }
          if (videoRel) {
            part.file.resume();
            continue;
          }
          if (part.mimetype !== "video/webm" && part.mimetype !== "video/mp4") {
            part.file.resume();
            return reply.code(400).send({ code: 400, message: "Unsupported video type" });
          }
          const localId = (fields.local_id || "").trim();
          if (!localId) {
            part.file.resume();
            return reply.code(400).send({ code: 400, message: "local_id must be sent before the video" });
          }

          // Oldindan kvota tekshiruvi (mijoz yuborgan size_bytes yoki Content-Length bo'yicha)
          const declared = Number(fields.size_bytes || req.headers["content-length"] || 0);
          const existing = await one<{ size_bytes: number }>(
            "SELECT size_bytes FROM recordings WHERE local_id = $1 AND user_id = $2",
            [localId, uid],
          );
          const usedWithoutThis = Number(user.storage_used_bytes) - Number(existing?.size_bytes ?? 0);
          if (declared > 0 && usedWithoutThis + declared > Number(user.storage_limit_bytes)) {
            part.file.resume();
            return reply.code(413).send({ code: 413, message: "Storage limit exceeded" });
          }

          const ext = part.mimetype === "video/mp4" ? "mp4" : "webm";
          const rel = relPath("videos", uid, `${localId}.${ext}`);
          size = await streamToFile(part.file, rel, config.maxVideoBytes);
          videoRel = rel;
        }
      } catch (err) {
        if (videoRel) await removeFile(videoRel);
        if (err instanceof FileTooLargeError) {
          return reply.code(413).send({ code: 413, message: "Video is too large" });
        }
        throw err;
      }

      if (!videoRel) return reply.code(400).send({ code: 400, message: "No video uploaded" });

      const meta = metaSchema.safeParse(fields);
      if (!meta.success) {
        await removeFile(videoRel);
        return reply.code(400).send({ code: 400, message: "Invalid metadata", data: meta.error.flatten() });
      }
      const m = meta.data;

      try {
        const row = await saveRecording(uid, m, videoRel, size);
        return reply.code(201).send(toClient(row));
      } catch (err) {
        await removeFile(videoRel);
        if (err instanceof FileTooLargeError) {
          return reply.code(413).send({ code: 413, message: "Storage limit exceeded" });
        }
        throw err;
      }
    },
  );

  // ---------- Oqim bilan yuklash: test davomida 5 soniyalik bo'laklar keladi ----------
  const localIdOk = (v: string) => /^[A-Za-z0-9_-]{1,64}$/.test(v);

  app.put(
    "/api/recordings/:localId/chunks/:seq",
    { preHandler: requireAuth, bodyLimit: CHUNK_LIMIT_BYTES + 1024 },
    async (req, reply) => {
      const uid = userId(req);
      const { localId, seq } = req.params as { localId: string; seq: string };
      const n = Number(seq);
      if (!localIdOk(localId) || !Number.isInteger(n) || n < 0 || n > 20000) {
        return reply.code(400).send({ code: 400, message: "Invalid chunk address" });
      }
      const body = req.body as Readable | undefined;
      if (!body || typeof body.pipe !== "function") {
        return reply.code(400).send({ code: 400, message: "Binary body expected" });
      }
      const { bytes } = await listChunks(uid, localId);
      if (bytes > config.maxVideoBytes) {
        body.resume();
        return reply.code(413).send({ code: 413, message: "Video is too large" });
      }
      try {
        const size = await writeChunk(uid, localId, n, body, CHUNK_LIMIT_BYTES);
        return { seq: n, size };
      } catch (err) {
        if (err instanceof FileTooLargeError) return reply.code(413).send({ code: 413, message: "Chunk is too large" });
        throw err;
      }
    },
  );

  // Serverga yetib kelgan bo'laklar (uzilishdan keyin mijoz yetishmaganlarini qayta yuboradi)
  app.get("/api/recordings/:localId/chunks", { preHandler: requireAuth }, async (req, reply) => {
    const { localId } = req.params as { localId: string };
    if (!localIdOk(localId)) return reply.code(400).send({ code: 400, message: "Invalid id" });
    return listChunks(userId(req), localId);
  });

  const finalizeSchema = metaSchema.omit({ local_id: true }).extend({
    chunks: z.coerce.number().int().min(1).max(20000),
    size_bytes: z.coerce.number().int().min(0).optional(),
    mime: z.enum(["video/webm", "video/mp4"]).default("video/webm"),
  });

  // Yakunlash: bo'laklarni birlashtirish, remux (ffmpeg bo'lsa), qatorni saqlash, zaxira
  app.post("/api/recordings/:localId/finalize", { preHandler: requireAuth }, async (req, reply) => {
    const uid = userId(req);
    const { localId } = req.params as { localId: string };
    if (!localIdOk(localId)) return reply.code(400).send({ code: 400, message: "Invalid id" });
    const parsed = finalizeSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid metadata", data: parsed.error.flatten() });
    const f = parsed.data;

    const { seqs, bytes } = await listChunks(uid, localId);
    const have = new Set(seqs);
    const missing: number[] = [];
    for (let i = 0; i < f.chunks; i++) if (!have.has(i)) missing.push(i);
    if (missing.length) {
      return reply.code(409).send({ code: 409, message: "Missing chunks", data: { missing: missing.slice(0, 200) } });
    }

    const user = await one<{ storage_limit_bytes: number; storage_used_bytes: number }>(
      "SELECT storage_limit_bytes, storage_used_bytes FROM users WHERE id = $1",
      [uid],
    );
    if (!user) return reply.code(401).send({ code: 401, message: "Unauthorized" });
    const existing = await one<{ size_bytes: number }>(
      "SELECT size_bytes FROM recordings WHERE local_id = $1 AND user_id = $2",
      [localId, uid],
    );
    const usedWithoutThis = Number(user.storage_used_bytes) - Number(existing?.size_bytes ?? 0);
    if (usedWithoutThis + bytes > Number(user.storage_limit_bytes)) {
      return reply.code(413).send({ code: 413, message: "Storage limit exceeded" });
    }

    const ext = f.mime === "video/mp4" ? "mp4" : "webm";
    const rel = relPath("videos", uid, `${localId}.${ext}`);
    let size: number;
    try {
      size = await assembleChunks(uid, localId, f.chunks, rel, config.maxVideoBytes);
    } catch (err) {
      await removeFile(rel);
      if (err instanceof FileTooLargeError) return reply.code(413).send({ code: 413, message: "Video is too large" });
      throw err;
    }
    // Davomiylik va cues (seek) uchun qayta muxlash — qayta kodlashsiz, xato bo'lsa asl fayl qoladi
    if (ext === "webm") {
      const remuxed = await remuxWebm(absPath(rel)).catch(() => false);
      if (remuxed) {
        const st = await fsp.stat(absPath(rel)).catch(() => null);
        if (st) size = st.size;
      }
    }

    try {
      const row = await saveRecording(uid, { ...f, local_id: localId }, rel, size);
      await removeChunkDir(uid, localId);
      return reply.code(201).send(toClient(row));
    } catch (err) {
      await removeFile(rel);
      if (err instanceof FileTooLargeError) return reply.code(413).send({ code: 413, message: "Storage limit exceeded" });
      throw err;
    }
  });

  // Tugallanmagan yozuvlarning bo'laklarini tozalash (ishga tushganda va har soatda)
  void cleanupStaleChunks(STALE_CHUNKS_MS).catch(() => undefined);
  setInterval(() => void cleanupStaleChunks(STALE_CHUNKS_MS).catch(() => undefined), 60 * 60 * 1000).unref();

  // Faqat metama'lumotni yaratish/yangilash (videosiz)
  app.put("/api/recordings/:localId/meta", { preHandler: requireAuth }, async (req, reply) => {
    const { localId } = req.params as { localId: string };
    const parsed = metaSchema.safeParse({ ...(req.body as object), local_id: localId });
    if (!parsed.success) {
      return reply.code(400).send({ code: 400, message: "Invalid input", data: parsed.error.flatten() });
    }
    const m = parsed.data;
    const uid = userId(req);
    const regId = await ownRegistrationId(uid, m.registration_id);
    const row = await one<RecordingRow>(
      `INSERT INTO recordings (local_id, user_id, "timestamp", duration, student_id, student_name, student_phone, registration_id)
       VALUES ($1, $2, COALESCE($3, now()), COALESCE($4, 0), COALESCE($5, ''), COALESCE($6, ''), COALESCE($7, ''), $8)
       ON CONFLICT (local_id, user_id) DO UPDATE SET
         "timestamp" = COALESCE(EXCLUDED."timestamp", recordings."timestamp"),
         duration = COALESCE(EXCLUDED.duration, recordings.duration),
         student_id = COALESCE(NULLIF(EXCLUDED.student_id, ''), recordings.student_id),
         student_name = COALESCE(NULLIF(EXCLUDED.student_name, ''), recordings.student_name),
         student_phone = COALESCE(NULLIF(EXCLUDED.student_phone, ''), recordings.student_phone),
         registration_id = COALESCE(EXCLUDED.registration_id, recordings.registration_id)
       RETURNING ${COLS}`,
      [m.local_id, uid, m.timestamp ?? null, m.duration ?? null, m.student_id ?? null, m.student_name ?? null, m.student_phone ?? null, regId],
    );
    return toClient(row!);
  });

  // O'chirish faqat asosiy saytdan (imtihon stansiyasi tokeni — 403)
  app.delete("/api/recordings/:localId", { preHandler: requireFullAuth }, async (req, reply) => {
    const { localId } = req.params as { localId: string };
    const uid = userId(req);
    const row = await one<{ video_path: string | null }>(
      "DELETE FROM recordings WHERE local_id = $1 AND user_id = $2 RETURNING video_path",
      [localId, uid],
    );
    if (!row) return reply.code(404).send({ code: 404, message: "Not found" });
    await removeFile(row.video_path);
    await recalcUsage(uid);
    return reply.code(204).send();
  });
}

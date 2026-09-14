import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { one, query } from "../db.js";
import { hashPassword, requireAuth, requireFullAuth, userId, verifyPassword } from "../auth.js";
import { removeFile } from "../storage.js";
import { config } from "../config.js";
import { getBotUsername, isBotRunning, isPublishing, notifyRegistrationStatus, publishResults, startBotFor, stopBotFor, validateBotToken } from "../bot.js";
import {
  activeAdminInvite,
  createAdminInvite,
  getOrCreateSettings,
  getRegistration,
  getRegistrationWithSpeaking,
  listBotAdmins,
  registrationToClient,
  removeBotAdmin,
  revokeAdminInvites,
  ADMIN_INVITE_TTL_HOURS,
  searchApprovedStudents,
  settingsToClient,
  REG_COLS,
  REG_WITH_SPEAKING_SELECT,
  SETTINGS_COLS,
  type RegistrationRow,
  type RegistrationStatus,
  type RegistrationWithSpeaking,
  type SettingsRow,
} from "../registrations.js";

const STATUSES = ["pending", "approved", "rejected"] as const;

const listQuerySchema = z.object({
  status: z.enum([...STATUSES, "all"]).optional().default("all"),
  q: z.string().trim().max(100).optional().default(""),
  // exclude (sukut) — arxivdagilar ko'rinmaydi; only — faqat arxiv; all — hammasi
  archived: z.enum(["exclude", "only", "all"]).optional().default("exclude"),
});

const archiveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(1000),
  archive: z.boolean().optional().default(true),
});

/** Toshkent vaqti bo'yicha sana kaliti: "2026-09-13" */
function tashkentDateKey(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  free_mode: z.boolean().optional(),
  center_name: z.string().trim().max(120).optional(),
  exam_price: z.coerce.number().int().min(0).max(100_000_000).optional(),
  card_number: z
    .string()
    .trim()
    .max(32)
    .refine((v) => v === "" || /^\d{16}$/.test(v.replace(/\s/g, "")), "Card number must be 16 digits")
    .transform((v) => v.replace(/\s/g, ""))
    .optional(),
  card_holder: z.string().trim().max(120).optional(),
  exam_info: z.string().trim().max(500).optional(),
  contact_info: z.string().trim().max(200).optional(),
  receipt_minutes: z.coerce.number().int().min(0).max(1440).optional(),
  video_retention_days: z.coerce.number().int().min(0).max(3650).optional(),
  ticket_footer: z.string().trim().max(60).optional(),
  ticket_qr_url: z.string().trim().max(300).optional(),
  station_enabled: z.boolean().optional(),
});

const scoreField = z.union([z.null(), z.coerce.number().min(0).max(100)]).optional();
const scoresSchema = z.object({
  listening: scoreField,
  reading: scoreField,
  writing: scoreField,
  speaking: scoreField,
  skip_listening: z.boolean().optional(),
  skip_reading: z.boolean().optional(),
  skip_writing: z.boolean().optional(),
  skip_speaking: z.boolean().optional(),
});

const searchSchema = z.object({ q: z.string().trim().min(2).max(60) });
const stationPasswordSchema = z.object({ password: z.string().min(6).max(100) });

const reviewSchema = z.object({
  status: z.enum(STATUSES),
  note: z.string().trim().max(500).optional().default(""),
});

/** Tashkilotchi botiga havola (deep-link'siz — botga kirgan har kim shu tashkilotchiga bog'lanadi) */
function botLink(ownerId: string, username: string): string {
  const u = getBotUsername(ownerId) || username;
  return u ? `https://t.me/${u}` : "";
}

function adminLink(ownerId: string, username: string, code: string): string {
  const u = getBotUsername(ownerId) || username;
  return u ? `https://t.me/${u}?start=adm_${code}` : "";
}

const botTokenSchema = z.object({ token: z.string().trim().regex(/^\d{6,}:[A-Za-z0-9_-]{30,}$/, "Invalid bot token format") });

async function settingsResponse(st: SettingsRow) {
  const [admins, invite] = await Promise.all([listBotAdmins(st.user_id), activeAdminInvite(st.user_id)]);
  return {
    ...settingsToClient(st),
    bot_username: getBotUsername(st.user_id) || st.bot_username,
    bot_link: botLink(st.user_id, st.bot_username),
    bot_running: isBotRunning(st.user_id),
    admins: admins.map((a) => ({ id: a.id, chat_id: Number(a.chat_id), title: a.title, username: a.username, added_at: a.added_at })),
    admin_invite: invite ? { code: invite.code, link: adminLink(st.user_id, st.bot_username, invite.code), expires_at: invite.expires_at } : null,
    admin_invite_ttl_hours: ADMIN_INVITE_TTL_HOURS,
    station_url: config.stationBaseUrl,
  };
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function registrationRoutes(app: FastifyInstance) {
  // ---- Sozlamalar (bot havolasi, narx, karta) ----
  app.get("/api/registrations/settings", { preHandler: requireFullAuth }, async (req) => {
    const st = await getOrCreateSettings(userId(req));
    return settingsResponse(st);
  });

  app.put("/api/registrations/settings", { preHandler: requireFullAuth }, async (req, reply) => {
    const parsed = settingsSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: 400, message: "Invalid input", data: parsed.error.flatten() });
    }
    const uid = userId(req);
    await getOrCreateSettings(uid);
    const d = parsed.data;
    const st = await one<SettingsRow>(
      `UPDATE registration_settings SET
         enabled         = COALESCE($2, enabled),
         free_mode       = COALESCE($3, free_mode),
         center_name     = COALESCE($4, center_name),
         exam_price      = COALESCE($5, exam_price),
         card_number     = COALESCE($6, card_number),
         card_holder     = COALESCE($7, card_holder),
         exam_info       = COALESCE($8, exam_info),
         contact_info    = COALESCE($9, contact_info),
         receipt_minutes = COALESCE($10, receipt_minutes),
         video_retention_days = COALESCE($11, video_retention_days),
         ticket_footer   = COALESCE($12, ticket_footer),
         ticket_qr_url   = COALESCE($13, ticket_qr_url),
         station_enabled = COALESCE($14, station_enabled)
       WHERE user_id = $1
       RETURNING ${SETTINGS_COLS}`,
      [uid, d.enabled ?? null, d.free_mode ?? null, d.center_name ?? null, d.exam_price ?? null, d.card_number ?? null, d.card_holder ?? null, d.exam_info ?? null, d.contact_info ?? null, d.receipt_minutes ?? null, d.video_retention_days ?? null, d.ticket_footer ?? null, d.ticket_qr_url ?? null, d.station_enabled ?? null],
    );
    return settingsResponse(st!);
  });

  // ---- Tashkilotchining Telegram boti (BotFather token) ----
  app.put("/api/registrations/settings/bot", { preHandler: requireFullAuth }, async (req, reply) => {
    const parsed = botTokenSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid bot token format" });
    const uid = userId(req);
    await getOrCreateSettings(uid);
    const token = parsed.data.token;
    let me: { username: string };
    try {
      me = await validateBotToken(token);
    } catch (err) {
      return reply.code(400).send({ code: 400, message: `Telegram rejected the token: ${err instanceof Error ? err.message : String(err)}` });
    }
    // Token — bot egaligining isboti: boshqa akkauntga ulangan bo'lsa, u yerdan uzib bu akkauntga o'tkazamiz
    const others = await query<{ user_id: string }>("SELECT user_id FROM registration_settings WHERE bot_token = $1 AND user_id <> $2", [token, uid]);
    for (const o of others) {
      await stopBotFor(o.user_id);
      await query("UPDATE registration_settings SET bot_token = NULL, bot_username = '' WHERE user_id = $1", [o.user_id]);
    }
    await query("UPDATE registration_settings SET bot_token = $2, bot_username = $3 WHERE user_id = $1", [uid, token, me.username]);
    try {
      await startBotFor(uid, token);
    } catch (err) {
      return reply.code(502).send({ code: 502, message: `Bot could not start: ${err instanceof Error ? err.message : String(err)}` });
    }
    const st = await getOrCreateSettings(uid);
    return settingsResponse(st);
  });

  app.delete("/api/registrations/settings/bot", { preHandler: requireFullAuth }, async (req) => {
    const uid = userId(req);
    await getOrCreateSettings(uid);
    await stopBotFor(uid);
    await query("UPDATE registration_settings SET bot_token = NULL, bot_username = '' WHERE user_id = $1", [uid]);
    const st = await getOrCreateSettings(uid);
    return settingsResponse(st);
  });

  // ---- Imtihon stansiyasi (cefr.*) paroli ----
  app.put("/api/registrations/settings/station", { preHandler: requireFullAuth }, async (req, reply) => {
    const parsed = stationPasswordSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Password must be 6-100 characters" });
    const uid = userId(req);
    await getOrCreateSettings(uid);
    // Parol boshqa tashkilotchida ham ishlatilmasin (kirishda faqat parol so'raladi)
    const others = await query<{ user_id: string; station_password_hash: string }>(
      "SELECT user_id, station_password_hash FROM registration_settings WHERE user_id <> $1 AND station_password_hash IS NOT NULL",
      [uid],
    );
    for (const o of others) {
      if (await verifyPassword(parsed.data.password, o.station_password_hash)) {
        return reply.code(409).send({ code: 409, message: "This password is already in use — choose another one" });
      }
    }
    const st = await one<SettingsRow>(
      `UPDATE registration_settings SET station_password_hash = $2, station_enabled = TRUE WHERE user_id = $1 RETURNING ${SETTINGS_COLS}`,
      [uid, await hashPassword(parsed.data.password)],
    );
    return settingsResponse(st!);
  });

  app.delete("/api/registrations/settings/station", { preHandler: requireFullAuth }, async (req) => {
    const uid = userId(req);
    await getOrCreateSettings(uid);
    const st = await one<SettingsRow>(`UPDATE registration_settings SET station_password_hash = NULL WHERE user_id = $1 RETURNING ${SETTINGS_COLS}`, [uid]);
    return settingsResponse(st!);
  });

  // ---- Admin bot paneli: bir martalik taklif havolasi va adminlar ----
  app.post("/api/registrations/settings/admin-invite", { preHandler: requireFullAuth }, async (req) => {
    const uid = userId(req);
    const st = await getOrCreateSettings(uid);
    await createAdminInvite(uid);
    return settingsResponse(st);
  });

  app.delete("/api/registrations/settings/admin-invite", { preHandler: requireFullAuth }, async (req) => {
    const uid = userId(req);
    const st = await getOrCreateSettings(uid);
    await revokeAdminInvites(uid);
    return settingsResponse(st);
  });

  app.delete("/api/registrations/settings/admins/:id", { preHandler: requireFullAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const uid = userId(req);
    const st = await getOrCreateSettings(uid);
    const ok = await removeBotAdmin(uid, id);
    if (!ok) return reply.code(404).send({ code: 404, message: "Not found" });
    return settingsResponse(st);
  });

  // ---- Mock test oldidan qidiruv (tasdiqlangan o'quvchilar, 2+ harf) ----
  app.get("/api/registrations/search", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = searchSchema.safeParse(req.query ?? {});
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "q must be 2-60 chars" });
    return searchApprovedStudents(userId(req), parsed.data.q);
  });

  // ---- Ro'yxat ----
  app.get("/api/registrations", { preHandler: requireFullAuth }, async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid query" });
    const { status, q, archived } = parsed.data;
    const uid = userId(req);

    const params: unknown[] = [uid];
    let where = "r.user_id = $1";
    if (archived === "exclude") where += " AND r.archived_at IS NULL";
    else if (archived === "only") where += " AND r.archived_at IS NOT NULL";
    if (status !== "all") {
      params.push(status);
      where += ` AND r.status = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where += ` AND (r.full_name ILIKE ${p} OR r.phone ILIKE ${p} OR r.center_name ILIKE ${p} OR r.telegram_username ILIKE ${p})`;
    }
    const rows = await query<RegistrationWithSpeaking>(`${REG_WITH_SPEAKING_SELECT} WHERE ${where} ORDER BY r.created DESC LIMIT 1000`, params);

    const countRows = await query<{ status: RegistrationStatus; n: number }>(
      "SELECT status, COUNT(*)::int AS n FROM registrations WHERE user_id = $1 AND archived_at IS NULL GROUP BY status",
      [uid],
    );
    const archivedRow = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM registrations WHERE user_id = $1 AND archived_at IS NOT NULL", [uid]);
    const counts = { total: 0, pending: 0, approved: 0, rejected: 0, archived: Number(archivedRow?.n ?? 0) };
    for (const r of countRows) {
      counts[r.status] = Number(r.n);
      counts.total += Number(r.n);
    }
    return { items: rows.map(registrationToClient), counts };
  });

  app.get("/api/registrations/export.csv", { preHandler: requireFullAuth }, async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query ?? {});
    const status = parsed.success ? parsed.data.status : "all";
    const archived = parsed.success ? parsed.data.archived : "exclude";
    const params: unknown[] = [userId(req)];
    let where = "r.user_id = $1";
    if (archived === "exclude") where += " AND r.archived_at IS NULL";
    else if (archived === "only") where += " AND r.archived_at IS NOT NULL";
    if (status !== "all") {
      params.push(status);
      where += " AND r.status = $2";
    }
    const rows = await query<RegistrationWithSpeaking>(`${REG_WITH_SPEAKING_SELECT} WHERE ${where} ORDER BY r.seq ASC`, params);
    const header = ["№", "Ism familiya", "Telefon", "O'quv markaz", "Ustoz", "Summa", "To'lov vaqti", "Chek", "Holat", "Izoh", "Telegram", "Yuborilgan", "Speaking video", "Listening", "Reading", "Writing", "Speaking", "Overall"];
    const statusUz: Record<RegistrationStatus, string> = { pending: "Kutilmoqda", approved: "Tasdiqlangan", rejected: "Rad etilgan" };
    const lines = [header.map(csvCell).join(";")];
    for (const r of rows) {
      const c = registrationToClient(r);
      lines.push(
        [
          c.seq,
          c.full_name,
          c.phone,
          c.center_name,
          c.teacher_name,
          c.amount === 0 ? "Bepul" : c.amount,
          c.payment_time,
          c.receipt_url ? "ha" : "yo'q",
          statusUz[c.status],
          c.note,
          c.telegram_username ? `@${c.telegram_username}` : c.telegram_id,
          new Date(c.created).toISOString(),
          c.speaking ? "ha" : "yo'q",
          c.scores.listening ?? "",
          c.scores.reading ?? "",
          c.scores.writing ?? "",
          c.scores.speaking ?? "",
          c.overall ?? "",
        ]
          .map(csvCell)
          .join(";"),
      );
    }
    const csv = String.fromCharCode(0xfeff) + lines.join("\r\n"); // BOM — Excel UTF-8 ni to'g'ri ochishi uchun
    return reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="royxat-${new Date().toISOString().slice(0, 10)}.csv"`)
      .send(csv);
  });

  // ---- Tasdiqlash / rad etish ----
  app.patch("/api/registrations/:id", { preHandler: requireFullAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = reviewSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: 400, message: "Invalid input", data: parsed.error.flatten() });
    }
    const uid = userId(req);
    const prev = await getRegistration(id, uid);
    if (!prev) return reply.code(404).send({ code: 404, message: "Not found" });

    const { status, note } = parsed.data;
    const row = await one<RegistrationRow>(
      `UPDATE registrations SET status = $3, note = $4, reviewed_at = CASE WHEN $3 = 'pending' THEN NULL ELSE now() END
       WHERE id = $1 AND user_id = $2 RETURNING ${REG_COLS}`,
      [id, uid, status, note],
    );
    // Holat o'zgargan bo'lsa talabaga Telegram orqali xabar (javobni kutmasdan)
    if (row && row.status !== prev.status && row.status !== "pending") {
      const st = await one<SettingsRow>(`SELECT ${SETTINGS_COLS} FROM registration_settings WHERE user_id = $1`, [uid]);
      void notifyRegistrationStatus(row, st);
    }
    return registrationToClient(row!);
  });

  // ---- Speaking urinishi: test boshlanganda hisoblanadi (limit tugasa 409). Stansiya tokeni ham ishlatadi ----
  app.post("/api/registrations/:id/attempt", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const uid = userId(req);
    const cur = await one<{ attempts: number; attempt_limit: number; status: string }>(
      "SELECT attempts, attempt_limit, status FROM registrations WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
      [id, uid],
    );
    if (!cur) return reply.code(404).send({ code: 404, message: "Not found" });
    if (cur.status !== "approved") return reply.code(400).send({ code: 400, message: "Registration is not approved" });
    if (Number(cur.attempts) >= Number(cur.attempt_limit)) {
      return reply.code(409).send({ code: 409, message: "Attempt limit reached", data: { attempts: Number(cur.attempts), attempt_limit: Number(cur.attempt_limit) } });
    }
    const row = await one<{ attempts: number; attempt_limit: number }>(
      "UPDATE registrations SET attempts = attempts + 1 WHERE id = $1 AND user_id = $2 AND attempts < attempt_limit RETURNING attempts, attempt_limit",
      [id, uid],
    );
    if (!row) return reply.code(409).send({ code: 409, message: "Attempt limit reached" });
    return { attempt: Number(row.attempts), attempt_limit: Number(row.attempt_limit) };
  });

  // Urinishlarni tiklash (admin) — masalan, texnik nosozlikdan keyin
  app.post("/api/registrations/:id/reset-attempts", { preHandler: requireFullAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const uid = userId(req);
    const upd = await one<{ id: string }>("UPDATE registrations SET attempts = 0 WHERE id = $1 AND user_id = $2 RETURNING id", [id, uid]);
    if (!upd) return reply.code(404).send({ code: 404, message: "Not found" });
    const row = await getRegistrationWithSpeaking(id, uid);
    return registrationToClient(row!);
  });

  // ---- Arxiv: tanlanganlarni arxivga ko'chirish / qaytarish ----
  app.post("/api/registrations/archive", { preHandler: requireFullAuth }, async (req, reply) => {
    const parsed = archiveSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid input", data: parsed.error.flatten() });
    const { ids, archive } = parsed.data;
    const rows = await query<{ id: string }>(
      archive
        ? "UPDATE registrations SET archived_at = now() WHERE user_id = $1 AND id = ANY($2::uuid[]) AND archived_at IS NULL RETURNING id"
        : "UPDATE registrations SET archived_at = NULL WHERE user_id = $1 AND id = ANY($2::uuid[]) AND archived_at IS NOT NULL RETURNING id",
      [userId(req), ids],
    );
    return { updated: rows.length };
  });

  // Arxiv: kunlik pack'lar (archived_at sanasi bo'yicha, Toshkent vaqti), har birida o'quvchilar to'liq ma'lumoti bilan
  app.get("/api/registrations/archive", { preHandler: requireFullAuth }, async (req) => {
    const rows = await query<RegistrationWithSpeaking>(
      `${REG_WITH_SPEAKING_SELECT} WHERE r.user_id = $1 AND r.archived_at IS NOT NULL ORDER BY r.archived_at DESC, r.seq ASC`,
      [userId(req)],
    );
    const packs = new Map<string, { date: string; items: ReturnType<typeof registrationToClient>[] }>();
    for (const r of rows) {
      const key = tashkentDateKey(new Date(r.archived_at!));
      if (!packs.has(key)) packs.set(key, { date: key, items: [] });
      packs.get(key)!.items.push(registrationToClient(r));
    }
    return [...packs.values()].map((p) => {
      const overalls = p.items.map((i) => i.overall).filter((v): v is number => v !== null);
      return {
        date: p.date,
        count: p.items.length,
        published: p.items.filter((i) => i.results_published_at).length,
        with_speaking: p.items.filter((i) => i.speaking).length,
        avg_overall: overalls.length ? Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length) : null,
        items: p.items,
      };
    });
  });

  // ---- Natijalar: L/R/W/S ballari (null = o'chirish) ----
  app.patch("/api/registrations/:id/scores", { preHandler: requireFullAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = scoresSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: 400, message: "Invalid scores", data: parsed.error.flatten() });
    }
    const uid = userId(req);
    const d = parsed.data;
    // undefined — tegilmaydi; null — tozalanadi; son — yoziladi
    const sets: string[] = [];
    const params: unknown[] = [id, uid];
    for (const k of ["listening", "reading", "writing", "speaking"] as const) {
      if (d[k] !== undefined) {
        params.push(d[k]);
        sets.push(`score_${k} = $${params.length}`);
      }
      const skip = d[`skip_${k}`];
      if (skip !== undefined) {
        params.push(skip);
        sets.push(`skip_${k} = $${params.length}`);
      }
    }
    if (!sets.length) {
      const cur = await getRegistration(id, uid);
      return cur ? registrationToClient(cur) : reply.code(404).send({ code: 404, message: "Not found" });
    }
    const updated = await one<{ id: string }>(`UPDATE registrations SET ${sets.join(", ")} WHERE id = $1 AND user_id = $2 RETURNING id`, params);
    if (!updated) return reply.code(404).send({ code: 404, message: "Not found" });
    const row = await getRegistrationWithSpeaking(id, uid);
    return registrationToClient(row!);
  });

  // ---- Natijalarni e'lon qilish: to'liq belgilanganlarga bot orqali individual yuborish ----
  // Oldindan ko'rish (tasdiqlash oynasi uchun): nechtasi yuboriladi, nechtasi to'liq emas
  app.get("/api/registrations/publish/preview", { preHandler: requireFullAuth }, async (req) => {
    const uid = userId(req);
    const rows = await query<RegistrationWithSpeaking>(
      `${REG_WITH_SPEAKING_SELECT} WHERE r.user_id = $1 AND r.status = 'approved' AND r.results_published_at IS NULL AND r.archived_at IS NULL ORDER BY r.seq`,
      [uid],
    );
    const items = rows.map(registrationToClient);
    return {
      ready: items.filter((i) => i.results_complete).map((i) => ({ id: i.id, seq: i.seq, full_name: i.full_name })),
      incomplete: items.filter((i) => !i.results_complete).map((i) => ({ id: i.id, seq: i.seq, full_name: i.full_name, missing_skills: i.missing_skills })),
      publishing: isPublishing(uid),
      bot_running: isBotRunning(uid),
    };
  });

  // Yuborishni boshlash (fonda; ro'yxat 15 soniyada yangilanib boradi). ids berilsa — faqat o'shalar (qayta yuborish ham).
  app.post("/api/registrations/publish", { preHandler: requireFullAuth }, async (req, reply) => {
    const uid = userId(req);
    if (!isBotRunning(uid)) return reply.code(503).send({ code: 503, message: "Bot is not running" });
    if (isPublishing(uid)) return reply.code(409).send({ code: 409, message: "Publishing is already in progress" });
    const body = (req.body ?? {}) as { ids?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 500) : null;
    const queued = await publishResults(uid, ids);
    return { queued };
  });

  app.delete("/api/registrations/:id", { preHandler: requireFullAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await one<{ receipt_path: string | null }>(
      "DELETE FROM registrations WHERE id = $1 AND user_id = $2 RETURNING receipt_path",
      [id, userId(req)],
    );
    if (!row) return reply.code(404).send({ code: 404, message: "Not found" });
    await removeFile(row.receipt_path);
    return reply.code(204).send();
  });
}

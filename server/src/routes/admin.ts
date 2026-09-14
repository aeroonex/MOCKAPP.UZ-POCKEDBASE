import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { one, query } from "../db.js";
import { hashPassword, publicUser, requireAdmin, userId, USER_COLUMNS, type AuthUserRow } from "../auth.js";
import { createReadStream, existsSync } from "node:fs";
import { loginPhotoAbs } from "../sessions.js";
import { createAdminBotLink } from "../admin-bot.js";

const updateUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  username: z.string().trim().regex(/^[a-z0-9_.]{3,40}$/i, "3-40 letters, digits, _ or .").optional(),
  password: z.string().min(6).max(200).optional(),
  first_name: z.string().trim().max(120).optional(),
  last_name: z.string().trim().max(120).optional(),
  role: z.enum(["user", "developer"]).optional(),
  tariff_name: z.enum(["Basic", "Premium"]).optional(),
  storage_limit_bytes: z.coerce.number().int().min(0).optional(),
  blocked: z.boolean().optional(),
  verified: z.boolean().optional(),
});

/** Superadmin (role=developer) uchun boshqaruv endpointlari. */
export async function adminRoutes(app: FastifyInstance) {
  app.get("/api/admin/users", { preHandler: requireAdmin }, async (req) => {
    const q = req.query as { page?: string; perPage?: string; search?: string };
    const page = Math.max(1, Number(q.page) || 1);
    const perPage = Math.min(200, Math.max(1, Number(q.perPage) || 50));
    const search = (q.search || "").trim().toLowerCase();
    const params: unknown[] = [];
    let where = "";
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE email ILIKE $1 OR username ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1`;
    }
    const total = await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM users ${where}`, params);
    params.push(perPage, (page - 1) * perPage);
    const rows = await query<AuthUserRow>(
      `SELECT ${USER_COLUMNS} FROM users ${where} ORDER BY created DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { page, perPage, totalItems: total?.n ?? 0, items: rows.map(publicUser) };
  });

  app.patch("/api/admin/users/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 400, message: "Invalid input", data: parsed.error.flatten() });
    }
    const { password, ...rest } = parsed.data;
    const fields: Record<string, unknown> = { ...rest };
    if (password) fields.password_hash = await hashPassword(password);
    const keys = Object.keys(fields);
    if (keys.length === 0) return reply.code(400).send({ code: 400, message: "Nothing to update" });
    if (fields.email && (await one("SELECT 1 FROM users WHERE email = $1 AND id <> $2", [fields.email, id]))) {
      return reply.code(409).send({ code: 409, message: "Email is already in use" });
    }
    if (fields.username && (await one("SELECT 1 FROM users WHERE username = $1 AND id <> $2", [fields.username, id]))) {
      return reply.code(409).send({ code: 409, message: "Username is already in use" });
    }
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const row = await one<AuthUserRow>(
      `UPDATE users SET ${sets} WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [id, ...keys.map((k) => fields[k])],
    );
    return row ? publicUser(row) : reply.code(404).send({ code: 404, message: "Not found" });
  });

  app.get("/api/admin/stats", { preHandler: requireAdmin }, async () => {
    const users = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM users");
    const admins = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM users WHERE role = 'developer'");
    const blocked = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM users WHERE blocked");
    const withBot = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM registration_settings WHERE bot_token IS NOT NULL");
    const registrations = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM registrations");
    const pendingPayments = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM payments WHERE status = 'pending'");
    const expired = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM users WHERE role <> 'developer' AND (paid_until IS NULL OR paid_until < now())");
    const premium = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM users WHERE tariff_name = 'Premium'");
    const questions = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM questions");
    const recordings = await one<{ n: number; bytes: number }>(
      "SELECT COUNT(*)::int AS n, COALESCE(SUM(size_bytes), 0)::bigint AS bytes FROM recordings",
    );
    return {
      users: users?.n ?? 0,
      admins: admins?.n ?? 0,
      blocked_users: blocked?.n ?? 0,
      organizers_with_bot: withBot?.n ?? 0,
      registrations: registrations?.n ?? 0,
      pending_payments: pendingPayments?.n ?? 0,
      expired_users: expired?.n ?? 0,
      premium_users: premium?.n ?? 0,
      questions: questions?.n ?? 0,
      recordings: recordings?.n ?? 0,
      storage_used_bytes: Number(recordings?.bytes ?? 0),
    };
  });

  // ---------- Nazorat: sessiyalar, onlayn holati, kirish tarixi ----------

  // "Onlayn" — oxirgi faollik shu davr ichida bo'lsa (soniya)
  const ONLINE_WINDOW = "5 minutes";

  const SESSION_SELECT = `
    SELECT s.id, s.user_id, s.panel, s.ip, s.device, s.country, s.city,
           s.login_at, s.last_seen, s.ended_at, s.requests, (s.photo_path <> '') AS has_photo,
           u.email, u.username, u.first_name, u.last_name, u.role, u.blocked,
           (s.ended_at IS NULL AND s.last_seen > now() - interval '${ONLINE_WINDOW}') AS online
    FROM auth_sessions s JOIN users u ON u.id = s.user_id`;

  // Umumiy holat: hozir onlayn, bugun kirganlar, panellar bo'yicha
  app.get("/api/admin/presence", { preHandler: requireAdmin }, async () => {
    const online = await one<{ n: number }>(
      `SELECT COUNT(DISTINCT user_id)::int AS n FROM auth_sessions WHERE ended_at IS NULL AND last_seen > now() - interval '${ONLINE_WINDOW}'`,
    );
    const byPanel = await query<{ panel: string; n: number }>(
      `SELECT panel, COUNT(DISTINCT user_id)::int AS n FROM auth_sessions WHERE ended_at IS NULL AND last_seen > now() - interval '${ONLINE_WINDOW}' GROUP BY panel`,
    );
    const today = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM login_events WHERE success AND created > date_trunc('day', now())");
    const failed = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM login_events WHERE NOT success AND created > now() - interval '24 hours'");
    return {
      online: online?.n ?? 0,
      by_panel: Object.fromEntries(byPanel.map((r) => [r.panel, r.n])),
      logins_today: today?.n ?? 0,
      failed_24h: failed?.n ?? 0,
    };
  });

  // Sessiyalar ro'yxati: onlaynlar tepada, keyin oxirgilar
  app.get("/api/admin/sessions", { preHandler: requireAdmin }, async (req) => {
    const q = req.query as { scope?: string; limit?: string };
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 80));
    const onlyOnline = q.scope === "online";
    const where = onlyOnline ? `WHERE s.ended_at IS NULL AND s.last_seen > now() - interval '${ONLINE_WINDOW}'` : "";
    const rows = await query(`${SESSION_SELECT} ${where} ORDER BY online DESC, s.last_seen DESC LIMIT $1`, [limit]);
    return { items: rows };
  });

  // Bitta foydalanuvchining to'liq faolligi: profil, sessiyalar, kirish tarixi
  app.get("/api/admin/users/:id/activity", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = await one(
      `SELECT ${USER_COLUMNS}, last_login_at, last_seen_at, last_login_ip, login_count FROM users WHERE id = $1`,
      [id],
    );
    if (!user) return reply.code(404).send({ code: 404, message: "Not found" });
    const sessions = await query(`${SESSION_SELECT} WHERE s.user_id = $1 ORDER BY s.last_seen DESC LIMIT 50`, [id]);
    const logins = await query(
      `SELECT id, success, reason, panel, ip, device, country, city, created, (photo_path <> '') AS has_photo
       FROM login_events WHERE user_id = $1 ORDER BY created DESC LIMIT 50`,
      [id],
    );
    return { user, sessions, logins };
  });

  // So'nggi kirish urinishlari (muvaffaqiyatsizlar ham) — xavfsizlik jurnali
  app.get("/api/admin/login-events", { preHandler: requireAdmin }, async (req) => {
    const q = req.query as { scope?: string; limit?: string };
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 60));
    const where = q.scope === "failed" ? "WHERE NOT e.success" : "";
    const rows = await query(
      `SELECT e.id, e.user_id, e.identity, e.success, e.reason, e.panel, e.ip, e.device, e.country, e.city, e.created,
              (e.photo_path <> '') AS has_photo, u.email, u.username, u.first_name, u.last_name
       FROM login_events e LEFT JOIN users u ON u.id = e.user_id ${where}
       ORDER BY e.created DESC LIMIT $1`,
      [limit],
    );
    return { items: rows };
  });

  // Kirishda olingan kamera kadri (sessiya id bo'yicha) — faqat admin
  app.get("/api/admin/sessions/:id/photo", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await one<{ photo_path: string }>("SELECT photo_path FROM auth_sessions WHERE id = $1", [id]);
    if (!row?.photo_path) return reply.code(404).send({ code: 404, message: "No photo" });
    const abs = loginPhotoAbs(row.photo_path);
    if (!existsSync(abs)) return reply.code(404).send({ code: 404, message: "No file" });
    return reply.header("Content-Type", "image/jpeg").header("Cache-Control", "private, max-age=3600").send(createReadStream(abs));
  });

  // Sessiyani majburan yopish (chiqarib yuborish emas — belgilash; token muddati bilan tugaydi)
  app.post("/api/admin/sessions/:id/end", { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    await query("UPDATE auth_sessions SET ended_at = now() WHERE id = $1", [id]);
    return { ok: true };
  });

  // Superadmin bildirishnoma boti uchun bir martalik ulanish havolasi (magic link)
  app.post("/api/admin/bot-link", { preHandler: requireAdmin }, async (_req, reply) => {
    const link = await createAdminBotLink();
    if (!link) return reply.code(503).send({ code: 503, message: "Bot sozlanmagan (ADMIN_BOT_TOKEN yo'q)" });
    return { link };
  });
}

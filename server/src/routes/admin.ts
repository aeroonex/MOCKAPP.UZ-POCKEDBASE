import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { one, query } from "../db.js";
import { hashPassword, publicUser, requireAdmin, USER_COLUMNS, type AuthUserRow } from "../auth.js";

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
}

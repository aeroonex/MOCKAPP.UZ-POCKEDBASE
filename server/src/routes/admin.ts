import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { one, query } from "../db.js";
import { publicUser, requireAdmin, USER_COLUMNS, type AuthUserRow } from "../auth.js";

const updateUserSchema = z.object({
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
    const fields = parsed.data;
    const keys = Object.keys(fields) as (keyof typeof fields)[];
    if (keys.length === 0) return reply.code(400).send({ code: 400, message: "Nothing to update" });
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const row = await one<AuthUserRow>(
      `UPDATE users SET ${sets} WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [id, ...keys.map((k) => fields[k])],
    );
    return row ? publicUser(row) : reply.code(404).send({ code: 404, message: "Not found" });
  });

  app.get("/api/admin/stats", { preHandler: requireAdmin }, async () => {
    const users = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM users");
    const premium = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM users WHERE tariff_name = 'Premium'");
    const questions = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM questions");
    const recordings = await one<{ n: number; bytes: number }>(
      "SELECT COUNT(*)::int AS n, COALESCE(SUM(size_bytes), 0)::bigint AS bytes FROM recordings",
    );
    return {
      users: users?.n ?? 0,
      premium_users: premium?.n ?? 0,
      questions: questions?.n ?? 0,
      recordings: recordings?.n ?? 0,
      storage_used_bytes: Number(recordings?.bytes ?? 0),
    };
  });
}

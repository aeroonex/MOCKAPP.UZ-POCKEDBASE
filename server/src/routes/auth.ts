import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { one, query } from "../db.js";
import {
  hashPassword,
  verifyPassword,
  publicUser,
  requireAuth,
  userId,
  USER_COLUMNS,
  type AuthUserRow,
  type JwtPayload,
} from "../auth.js";
import { config } from "../config.js";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(6).max(200);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  passwordConfirm: z.string().optional(),
  first_name: z.string().trim().max(120).default(""),
  last_name: z.string().trim().max(120).default(""),
});

const loginSchema = z.object({
  identity: emailSchema,
  password: z.string().min(1).max(200),
});

const updateMeSchema = z.object({
  first_name: z.string().trim().max(120).optional(),
  last_name: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  avatar_url: z.string().trim().max(2000).optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1).max(200),
  password: passwordSchema,
});

const changeEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

async function usernameFromEmail(email: string): Promise<string> {
  const base = email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 40) || "user";
  let candidate = base;
  for (let i = 0; i < 20; i++) {
    const exists = await one("SELECT 1 FROM users WHERE username = $1", [candidate]);
    if (!exists) return candidate;
    candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `${base}${Date.now()}`;
}

export async function authRoutes(app: FastifyInstance) {
  const authLimit = { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } };

  // Ro'yxatdan o'tish
  app.post("/api/auth/register", authLimit, async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 400, message: "Invalid input", data: parsed.error.flatten() });
    }
    const { email, password, passwordConfirm, first_name, last_name } = parsed.data;
    if (passwordConfirm !== undefined && passwordConfirm !== password) {
      return reply.code(400).send({ code: 400, message: "Passwords do not match" });
    }

    const exists = await one("SELECT 1 FROM users WHERE email = $1", [email]);
    if (exists) {
      return reply.code(400).send({ code: 400, message: "Email is already registered" });
    }

    const username = await usernameFromEmail(email);
    const password_hash = await hashPassword(password);
    const row = await one<AuthUserRow>(
      `INSERT INTO users (email, username, password_hash, first_name, last_name, storage_limit_bytes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${USER_COLUMNS}`,
      [email, username, password_hash, first_name, last_name, config.defaultStorageLimitBytes],
    );
    if (!row) return reply.code(500).send({ code: 500, message: "Failed to create user" });

    const token = await reply.jwtSign({ sub: row.id, role: row.role } satisfies JwtPayload, {
      expiresIn: config.jwtExpiresIn,
    });
    return reply.code(201).send({ token, record: publicUser(row) });
  });

  // Kirish
  app.post("/api/auth/login", authLimit, async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 400, message: "Invalid input" });
    }
    const { identity, password } = parsed.data;
    const row = await one<AuthUserRow & { password_hash: string }>(
      `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
      [identity],
    );
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return reply.code(400).send({ code: 400, message: "Invalid email or password" });
    }
    if (row.blocked) {
      return reply.code(403).send({ code: 403, message: "Account is blocked" });
    }
    const token = await reply.jwtSign({ sub: row.id, role: row.role } satisfies JwtPayload, {
      expiresIn: config.jwtExpiresIn,
    });
    return { token, record: publicUser(row) };
  });

  // Joriy foydalanuvchi (faqat ma'lumot; token o'zgarmaydi)
  app.get("/api/auth/me", { preHandler: requireAuth }, async (req, reply) => {
    const row = await one<AuthUserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [userId(req)]);
    if (!row) return reply.code(401).send({ code: 401, message: "Unauthorized" });
    if (row.blocked) return reply.code(403).send({ code: 403, message: "Account is blocked" });
    return publicUser(row);
  });

  // Token muddatini uzaytirish (yangi token + ma'lumot)
  app.post("/api/auth/refresh", { preHandler: requireAuth }, async (req, reply) => {
    const row = await one<AuthUserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [userId(req)]);
    if (!row) return reply.code(401).send({ code: 401, message: "Unauthorized" });
    if (row.blocked) return reply.code(403).send({ code: 403, message: "Account is blocked" });
    const token = await reply.jwtSign({ sub: row.id, role: row.role } satisfies JwtPayload, {
      expiresIn: config.jwtExpiresIn,
    });
    return { token, record: publicUser(row) };
  });

  // Profilni yangilash (faqat ruxsat etilgan maydonlar — role/tarif/limit emas)
  app.patch("/api/auth/me", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 400, message: "Invalid input", data: parsed.error.flatten() });
    }
    const fields = parsed.data;
    const keys = Object.keys(fields) as (keyof typeof fields)[];
    if (keys.length === 0) {
      const row = await one<AuthUserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [userId(req)]);
      return row ? publicUser(row) : reply.code(404).send({ code: 404, message: "Not found" });
    }
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const row = await one<AuthUserRow>(
      `UPDATE users SET ${sets} WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [userId(req), ...keys.map((k) => fields[k])],
    );
    return row ? publicUser(row) : reply.code(404).send({ code: 404, message: "Not found" });
  });

  // Parolni almashtirish
  app.post("/api/auth/change-password", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 400, message: "Invalid input" });
    }
    const row = await one<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [userId(req)]);
    if (!row || !(await verifyPassword(parsed.data.oldPassword, row.password_hash))) {
      return reply.code(400).send({ code: 400, message: "Current password is incorrect" });
    }
    await query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId(req), await hashPassword(parsed.data.password)]);
    return { ok: true };
  });

  // Emailni almashtirish
  app.post("/api/auth/change-email", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = changeEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 400, message: "Invalid input" });
    }
    const row = await one<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [userId(req)]);
    if (!row || !(await verifyPassword(parsed.data.password, row.password_hash))) {
      return reply.code(400).send({ code: 400, message: "Password is incorrect" });
    }
    const taken = await one("SELECT 1 FROM users WHERE email = $1 AND id <> $2", [parsed.data.email, userId(req)]);
    if (taken) return reply.code(400).send({ code: 400, message: "Email is already registered" });
    const updated = await one<AuthUserRow>(
      `UPDATE users SET email = $2 WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [userId(req), parsed.data.email],
    );
    return updated ? publicUser(updated) : reply.code(404).send({ code: 404, message: "Not found" });
  });
}

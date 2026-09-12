import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { config } from "./config.js";
import { migrate, one, pool, query } from "./db.js";
import { hashPassword } from "./auth.js";
import { ensureStorageDirs, UPLOADS_DIR } from "./storage.js";
import { authRoutes } from "./routes/auth.js";
import { questionRoutes } from "./routes/questions.js";
import { imageRoutes } from "./routes/images.js";
import { recordingRoutes } from "./routes/recordings.js";
import { adminRoutes } from "./routes/admin.js";

/** ADMIN_EMAIL/ADMIN_PASSWORD berilgan bo'lsa, birinchi ishga tushishda superadmin yaratadi. */
async function ensureAdmin(): Promise<void> {
  if (!config.adminEmail || !config.adminPassword) return;
  const existing = await one<{ id: string; role: string }>("SELECT id, role FROM users WHERE email = $1", [config.adminEmail]);
  if (existing) {
    if (existing.role !== "developer") {
      await query("UPDATE users SET role = 'developer' WHERE id = $1", [existing.id]);
    }
    return;
  }
  const username = config.adminEmail.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase() || "admin";
  await query(
    `INSERT INTO users (email, username, password_hash, first_name, role, tariff_name, storage_limit_bytes, verified)
     VALUES ($1, $2, $3, 'Admin', 'developer', 'Premium', $4, TRUE)
     ON CONFLICT (username) DO NOTHING`,
    [config.adminEmail, username, await hashPassword(config.adminPassword), 100 * 1024 * 1024 * 1024],
  );
  console.log(`[bootstrap] superadmin created: ${config.adminEmail}`);
}

async function main() {
  await migrate();
  await ensureStorageDirs();
  await ensureAdmin();

  const app = Fastify({
    logger: config.isProd ? { level: "info" } : { level: "debug" },
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024, // JSON so'rovlar uchun; video yuklash marshrutida alohida oshiriladi
  });

  await app.register(cors, {
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    credentials: false,
  });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  await app.register(jwt, { secret: config.jwtSecret });
  await app.register(multipart, {
    limits: { fileSize: config.maxVideoBytes, files: 1, fields: 20, fieldSize: 10_000 },
  });

  // Yuklangan fayllar: /files/<images|videos>/<user>/<name> (Range so'rovlari qo'llab-quvvatlanadi)
  await app.register(fastifyStatic, {
    root: UPLOADS_DIR,
    prefix: "/files/",
    decorateReply: false,
    acceptRanges: true,
    maxAge: "7d",
    immutable: true,
    index: false,
    list: false,
  });

  app.get("/api/health", async () => {
    await pool.query("SELECT 1");
    return { message: "API is healthy.", code: 200 };
  });

  await app.register(authRoutes);
  await app.register(questionRoutes);
  await app.register(imageRoutes);
  await app.register(recordingRoutes);
  await app.register(adminRoutes);

  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    const status = err.statusCode ?? 500;
    if (status >= 500) app.log.error(err);
    reply.code(status).send({
      code: status,
      message: status >= 500 && config.isProd ? "Internal server error" : err.message,
    });
  });

  await app.listen({ port: config.port, host: config.host });

  const shutdown = async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


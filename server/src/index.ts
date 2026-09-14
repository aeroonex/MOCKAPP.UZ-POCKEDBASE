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
import { registrationRoutes } from "./routes/registrations.js";
import { stationRoutes } from "./routes/station.js";
import { billingRoutes } from "./routes/billing.js";
import { statsRoutes } from "./routes/stats.js";
import { netRoutes } from "./routes/net.js";
import { touchSession } from "./sessions.js";
import { ttsRoutes } from "./routes/tts.js";
import { startTtsWorker } from "./tts.js";
import { rtcRoutes } from "./routes/rtc.js";
import { startAdminBot } from "./admin-bot.js";
import type { JwtPayload } from "./auth.js";
import { startAllBots, startVideoCleanupJob, stopAllBots } from "./bot.js";

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

  // Obuna tekshiruvi: bloklangan yoki muddati tugagan foydalanuvchi (developer emas) uchun
  // faqat kirish/billing/sozlamalar endpointlari ochiq, qolganlari 402 (Payment Required).
  const OPEN_PREFIXES = ["/api/auth/", "/api/billing", "/api/health", "/api/net/", "/api/tts/phrases", "/api/tts/status", "/api/station/", "/api/registrations/settings", "/files/"];
  app.addHook("preHandler", async (req, reply) => {
    const url = req.url.split("?")[0];
    if (!url.startsWith("/api/") || OPEN_PREFIXES.some((p) => url.startsWith(p))) return;
    if (!req.headers.authorization) return; // ommaviy so'rovlar o'z tekshiruviga ega
    let payload: JwtPayload;
    try {
      payload = await req.jwtVerify<JwtPayload>();
    } catch {
      return; // yaroqsiz token — marshrutning o'zi 401 qaytaradi
    }
    touchSession(payload.sub);
    if (payload.role === "developer") return;
    const u = await one<{ blocked: boolean; paid_until: Date | null; role: string }>("SELECT blocked, paid_until, role FROM users WHERE id = $1", [payload.sub]);
    if (!u || u.role === "developer") return;
    const expired = !u.paid_until || new Date(u.paid_until).getTime() <= Date.now();
    if (u.blocked || expired) {
      return reply.code(402).send({ code: 402, message: u.blocked ? "Account is blocked" : "Subscription expired", reason: u.blocked ? "blocked" : "expired" });
    }
  });
  // Xom ikkilik tana (video bo'laklari, tezlik sinovi) — oqim sifatida marshrutga beriladi
  app.addContentTypeParser("application/octet-stream", (_req, payload, done) => done(null, payload));

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
  await app.register(registrationRoutes);
  await app.register(stationRoutes);
  await app.register(billingRoutes);
  await app.register(statsRoutes);
  await app.register(netRoutes);
  await app.register(ttsRoutes);
  await app.register(rtcRoutes);
  startTtsWorker();
  void startAdminBot();

  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    const status = err.statusCode ?? 500;
    if (status >= 500) app.log.error(err);
    reply.code(status).send({
      code: status,
      message: status >= 500 && config.isProd ? "Internal server error" : err.message,
    });
  });

  await app.listen({ port: config.port, host: config.host });

  // Tashkilotchilarning Telegram botlari (har biri o'z tokeni bilan). Xato bo'lsa API ishlayveradi.
  startAllBots().catch((err) => console.error("[bot] ishga tushmadi:", err instanceof Error ? err.message : err));
  startVideoCleanupJob();

  const shutdown = async () => {
    await stopAllBots();
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


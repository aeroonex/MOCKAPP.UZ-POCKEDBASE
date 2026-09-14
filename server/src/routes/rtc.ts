import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireAuth, userId, type JwtPayload } from "../auth.js";
import { one } from "../db.js";

/**
 * Jonli bir tomonlama kuzatuv uchun WebRTC signalizatsiya (SSE + POST — WebSocketsiz).
 *  - Har kirgan foydalanuvchi brauzeri "source" bo'lib SSE ochadi (kamera talab qilinmaydi, faqat kutadi).
 *  - Superadmin (developer) "watcher" bo'lib ulanadi, onlayn sourcelarni ko'radi va birini kuzatishni so'raydi.
 *  - Source so'rovni olgach kamera+mikrofonni yoqadi (ekranida "Kamera yoniq" belgisi bilan) va oqimni yuboradi.
 * Signalizatsiya (offer/answer/ICE) shu server orqali uzatiladi; media to'g'ridan-to'g'ri (P2P) ketadi.
 */

type Role = "source" | "watcher";

interface Conn {
  id: string;
  role: Role;
  userId: string;
  sid: string; // sessiya id (source uchun)
  name: string;
  reply: FastifyReply;
  alive: boolean;
}

const conns = new Map<string, Conn>();
const sourcesByUser = () => {
  // Har foydalanuvchi uchun eng so'nggi source ulanishi (bittadan)
  const map = new Map<string, Conn>();
  for (const c of conns.values()) if (c.role === "source") map.set(c.userId, c);
  return map;
};

function sseSend(c: Conn, event: string, data: unknown): void {
  if (!c.alive) return;
  try {
    c.reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    /* uzilgan */
  }
}

/** Barcha watcherlarga joriy onlayn sourcelar ro'yxatini yuboradi. */
function broadcastSources(): void {
  const list = [...sourcesByUser().values()].map((c) => ({ connId: c.id, userId: c.userId, sid: c.sid, name: c.name }));
  for (const c of conns.values()) if (c.role === "watcher") sseSend(c, "sources", { list });
}

const signalSchema = z.object({
  to: z.string().min(1).max(64),
  callId: z.string().min(1).max(80),
  kind: z.enum(["offer", "answer", "ice"]),
  data: z.unknown(),
});
const watchSchema = z.object({ target: z.string().min(1).max(64), callId: z.string().min(1).max(80) });
const stopSchema = z.object({ to: z.string().min(1).max(64), callId: z.string().min(1).max(80) });

export async function rtcRoutes(app: FastifyInstance) {
  // SSE oqim — source yoki watcher shu yerga ulanadi (fetch + Authorization sarlavhasi bilan)
  app.get("/api/rtc/stream", { preHandler: requireAuth }, async (req, reply) => {
    const q = req.query as { role?: string; sid?: string };
    const role: Role = q.role === "watcher" ? "watcher" : "source";
    const payload = req.user as JwtPayload;
    if (role === "watcher" && payload.role !== "developer") {
      return reply.code(403).send({ code: 403, message: "Faqat superadmin kuzata oladi" });
    }
    const uid = userId(req);
    const u = await one<{ first_name: string; last_name: string; username: string }>(
      "SELECT first_name, last_name, username FROM users WHERE id = $1",
      [uid],
    );
    const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ") || u?.username || "—";

    const c: Conn = { id: randomUUID(), role, userId: uid, sid: payload.sid || "", name, reply, alive: true };
    conns.set(c.id, c);

    reply.hijack(); // javobni o'zimiz boshqaramiz (uzun yashovchi SSE)
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx buferlamasin — hodisalar darhol yetsin
    });
    reply.raw.write(`event: hello\ndata: ${JSON.stringify({ connId: c.id })}\n\n`);

    if (role === "watcher") {
      const list = [...sourcesByUser().values()].map((s) => ({ connId: s.id, userId: s.userId, sid: s.sid, name: s.name }));
      sseSend(c, "sources", { list });
    } else {
      broadcastSources();
    }

    const keepalive = setInterval(() => {
      if (!c.alive) return;
      try {
        reply.raw.write(": keepalive\n\n");
      } catch {
        /* ignore */
      }
    }, 15000);

    req.raw.on("close", () => {
      c.alive = false;
      clearInterval(keepalive);
      conns.delete(c.id);
      // Bog'liq tomonlarni xabardor qilamiz (kuzatuv to'xtadi)
      for (const other of conns.values()) sseSend(other, "peer-gone", { connId: c.id });
      if (c.role === "source") broadcastSources();
    });

    return reply;
  });

  // Watcher: berilgan sourceni kuzatishni boshlaydi
  app.post("/api/rtc/watch", { preHandler: requireAuth }, async (req, reply) => {
    if ((req.user as JwtPayload).role !== "developer") return reply.code(403).send({ code: 403, message: "Forbidden" });
    const parsed = watchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid" });
    const { target, callId } = parsed.data;
    // target — source connId yoki userId
    const src = conns.get(target) || sourcesByUser().get(target);
    if (!src || src.role !== "source") return reply.code(404).send({ code: 404, message: "Source offline" });
    // Watcher connId'sini topamiz (so'rovchi userning watcher ulanishi)
    const watcher = [...conns.values()].find((c) => c.role === "watcher" && c.userId === userId(req));
    if (!watcher) return reply.code(409).send({ code: 409, message: "No watcher stream" });
    sseSend(src, "watch-start", { callId, watcherId: watcher.id });
    return { ok: true, sourceId: src.id };
  });

  // Offer/answer/ICE uzatish
  app.post("/api/rtc/signal", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = signalSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid" });
    const { to, callId, kind, data } = parsed.data;
    const dest = conns.get(to);
    if (!dest) return reply.code(404).send({ code: 404, message: "Peer gone" });
    // Xavfsizlik: watcher faqat developer bo'lishi; source faqat o'z oqimini yuboradi (relay, tekshiruv yengil)
    const from = [...conns.values()].find((c) => c.userId === userId(req));
    sseSend(dest, "signal", { callId, kind, data, from: from?.id });
    return { ok: true };
  });

  // Kuzatuvni to'xtatish
  app.post("/api/rtc/stop", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = stopSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid" });
    const dest = conns.get(parsed.data.to);
    if (dest) sseSend(dest, "watch-stop", { callId: parsed.data.callId });
    return { ok: true };
  });
}

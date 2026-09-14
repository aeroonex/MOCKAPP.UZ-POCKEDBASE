import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireAuth, userId, type JwtPayload } from "../auth.js";
import { one } from "../db.js";

/**
 * Jonli bir tomonlama kuzatuv uchun WebRTC signalizatsiya (SSE + POST — WebSocketsiz).
 * Signallar BARQAROR `userId` + rol bo'yicha yo'naltiriladi — SSE ulanishi uzilib qayta ulansa ham
 * qo'ng'iroq buzilmaydi (connId o'zgarsa ham). Media WebRTC bilan to'g'ridan-to'g'ri (P2P/relay) ketadi.
 */

type Role = "source" | "watcher";

interface Conn {
  id: string;
  role: Role;
  userId: string;
  sid: string;
  name: string;
  write: (event: string, data: unknown) => void;
  alive: boolean;
}

const conns = new Map<string, Conn>();

/** Berilgan (userId, role) uchun eng so'nggi tirik ulanish. */
function findConn(uid: string, role: Role): Conn | null {
  let latest: Conn | null = null;
  for (const c of conns.values()) if (c.alive && c.userId === uid && c.role === role) latest = c;
  return latest;
}

function onlineSources(): Array<{ userId: string; sid: string; name: string }> {
  const map = new Map<string, { userId: string; sid: string; name: string }>();
  for (const c of conns.values()) if (c.alive && c.role === "source") map.set(c.userId, { userId: c.userId, sid: c.sid, name: c.name });
  return [...map.values()];
}

function broadcastSources(): void {
  const list = onlineSources();
  for (const c of conns.values()) if (c.alive && c.role === "watcher") c.write("sources", { list });
}

const signalSchema = z.object({
  toUserId: z.string().min(1).max(64),
  toRole: z.enum(["source", "watcher"]),
  callId: z.string().min(1).max(80),
  kind: z.enum(["offer", "answer", "ice"]),
  data: z.unknown(),
});
const watchSchema = z.object({ targetUserId: z.string().min(1).max(64), callId: z.string().min(1).max(80) });
const stopSchema = z.object({ toUserId: z.string().min(1).max(64), toRole: z.enum(["source", "watcher"]), callId: z.string().min(1).max(80) });

export async function rtcRoutes(app: FastifyInstance) {
  app.get("/api/rtc/stream", { preHandler: requireAuth }, async (req, reply) => {
    const q = req.query as { role?: string };
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

    const write = (event: string, data: unknown) => {
      try {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {
        /* uzilgan */
      }
    };
    const c: Conn = { id: randomUUID(), role, userId: uid, sid: payload.sid || "", name, write, alive: true };
    conns.set(c.id, c);

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    // Proxy buferini "sindirish" uchun boshda 2KB izoh, keyin darhol hello
    reply.raw.write(`:${" ".repeat(2048)}\n\n`);
    c.write("hello", { connId: c.id, userId: uid });

    if (role === "watcher") c.write("sources", { list: onlineSources() });
    else broadcastSources();

    const keepalive = setInterval(() => {
      if (c.alive) {
        try {
          reply.raw.write(": ka\n\n");
        } catch {
          /* ignore */
        }
      }
    }, 10000);

    req.raw.on("close", () => {
      c.alive = false;
      clearInterval(keepalive);
      conns.delete(c.id);
      if (c.role === "source") broadcastSources();
    });
  });

  // Watcher: berilgan foydalanuvchini (userId) kuzatishni boshlaydi
  app.post("/api/rtc/watch", { preHandler: requireAuth }, async (req, reply) => {
    if ((req.user as JwtPayload).role !== "developer") return reply.code(403).send({ code: 403, message: "Forbidden" });
    const parsed = watchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid" });
    const src = findConn(parsed.data.targetUserId, "source");
    if (!src) return reply.code(404).send({ code: 404, message: "Source offline" });
    src.write("watch-start", { callId: parsed.data.callId, watcherUserId: userId(req) });
    return { ok: true };
  });

  // Offer/answer/ICE uzatish (barqaror userId bo'yicha)
  app.post("/api/rtc/signal", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = signalSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid" });
    const { toUserId, toRole, callId, kind, data } = parsed.data;
    const dest = findConn(toUserId, toRole);
    if (!dest) return reply.code(404).send({ code: 404, message: "Peer offline" });
    dest.write("signal", { callId, kind, data, fromUserId: userId(req) });
    return { ok: true };
  });

  app.post("/api/rtc/stop", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = stopSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid" });
    const dest = findConn(parsed.data.toUserId, parsed.data.toRole);
    if (dest) dest.write("watch-stop", { callId: parsed.data.callId });
    return { ok: true };
  });
}

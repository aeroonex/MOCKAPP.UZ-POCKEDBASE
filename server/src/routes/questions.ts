import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { one, query } from "../db.js";
import { requireAuth, requireFullAuth, userId, type JwtPayload } from "../auth.js";
import { enqueueTts, ttsForQuestion } from "../tts.js";
import { notifyNewQuestion } from "../admin-bot.js";

const PARTS = ["Part 1.1", "Part 1.2", "Part 2", "Part 3"] as const;

const questionBody = z.object({
  type: z.enum(PARTS),
  sub_questions: z.array(z.string().trim().max(2000)).max(50).default([]),
  question_text: z.string().trim().max(5000).default(""),
  image_urls: z.array(z.string().trim().max(2000)).max(4).default([]),
});

interface QuestionRow {
  id: string;
  user_id: string | null;
  type: string;
  sub_questions: string[];
  question_text: string;
  image_urls: string[];
  date: Date;
  last_used: Date | null;
}

/** Frontend user_id="" ni ommaviy savol deb tushunadi; DB da NULL. */
function toClient(q: QuestionRow) {
  return {
    id: q.id,
    user_id: q.user_id ?? "",
    type: q.type,
    sub_questions: q.sub_questions ?? [],
    question_text: q.question_text ?? "",
    image_urls: q.image_urls ?? [],
    date: q.date,
    last_used: q.last_used,
    // Oldindan sintez qilingan ovozlar (Piper); null — hali tayyor emas, mijoz brauzer TTS'iga qaytadi
    tts: ttsForQuestion(q),
  };
}

const COLS = "id, user_id, type, sub_questions, question_text, image_urls, date, last_used";

/** Token bo'lsa tekshiradi, bo'lmasa null (mehmon rejimi uchun). */
async function optionalUser(req: FastifyRequest): Promise<string | null> {
  if (!req.headers.authorization) return null;
  try {
    const payload = await req.jwtVerify<JwtPayload>();
    return payload.sub;
  } catch {
    return null;
  }
}

export async function questionRoutes(app: FastifyInstance) {
  // Ro'yxat: o'z savollari (token bilan) yoki ommaviy savollar (tokensiz / ?scope=public)
  app.get("/api/questions", async (req) => {
    const q = req.query as { scope?: string; type?: string };
    const uid = q.scope === "public" ? null : await optionalUser(req);
    // Avtomatik cooldown: biror qismning BARCHA savollari 2 soat ichida ishlatilgan bo'lsa —
    // o'sha qism kutish vaqti o'z-o'zidan tiklanadi (xuddi "Kutish vaqtini tiklash" tugmasi bosilgandek).
    if (uid) {
      const reset = await query<{ type: string }>(
        `UPDATE questions SET last_used = NULL
         WHERE user_id = $1 AND type IN (
           SELECT type FROM questions WHERE user_id = $1 GROUP BY type
           HAVING COUNT(*) = COUNT(*) FILTER (WHERE last_used IS NOT NULL AND last_used > now() - interval '2 hours')
         )
         RETURNING type`,
        [uid],
      );
      if (reset.length) req.log.info({ uid, parts: [...new Set(reset.map((r) => r.type))] }, "question cooldown auto-reset");
    }
    const params: unknown[] = [];
    let where = uid ? "user_id = $1" : "user_id IS NULL";
    if (uid) params.push(uid);
    if (q.type && (PARTS as readonly string[]).includes(q.type)) {
      params.push(q.type);
      where += ` AND type = $${params.length}`;
    }
    const rows = await query<QuestionRow>(`SELECT ${COLS} FROM questions WHERE ${where} ORDER BY date ASC`, params);
    return rows.map(toClient);
  });

  app.get("/api/questions/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await one<QuestionRow>(`SELECT ${COLS} FROM questions WHERE id = $1 AND user_id = $2`, [id, userId(req)]);
    return row ? toClient(row) : reply.code(404).send({ code: 404, message: "Not found" });
  });

  app.post("/api/questions", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = questionBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 400, message: "Invalid input", data: parsed.error.flatten() });
    }
    const b = parsed.data;
    const row = await one<QuestionRow>(
      `INSERT INTO questions (user_id, type, sub_questions, question_text, image_urls)
       VALUES ($1, $2, $3::jsonb, $4, $5::jsonb) RETURNING ${COLS}`,
      [userId(req), b.type, JSON.stringify(b.sub_questions), b.question_text, JSON.stringify(b.image_urls)],
    );
    enqueueTts([...b.sub_questions, b.question_text]);
    // Superadmin botiga bildirishnoma
    void (async () => {
      const u = await one<{ name: string }>(
        "SELECT COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), username) AS name FROM users WHERE id = $1",
        [userId(req)],
      ).catch(() => null);
      const preview = b.question_text || b.sub_questions.join(" · ");
      notifyNewQuestion(u?.name || "—", b.type, preview);
    })();
    return reply.code(201).send(toClient(row!));
  });

  app.patch("/api/questions/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = questionBody.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 400, message: "Invalid input", data: parsed.error.flatten() });
    }
    const b = parsed.data;
    const sets: string[] = [];
    const params: unknown[] = [id, userId(req)];
    const push = (col: string, val: unknown, cast = "") => {
      params.push(val);
      sets.push(`${col} = $${params.length}${cast}`);
    };
    if (b.type !== undefined) push("type", b.type);
    if (b.sub_questions !== undefined) push("sub_questions", JSON.stringify(b.sub_questions), "::jsonb");
    if (b.question_text !== undefined) push("question_text", b.question_text);
    if (b.image_urls !== undefined) push("image_urls", JSON.stringify(b.image_urls), "::jsonb");
    if (sets.length === 0) {
      const row = await one<QuestionRow>(`SELECT ${COLS} FROM questions WHERE id = $1 AND user_id = $2`, [id, userId(req)]);
      return row ? toClient(row) : reply.code(404).send({ code: 404, message: "Not found" });
    }
    const row = await one<QuestionRow>(
      `UPDATE questions SET ${sets.join(", ")} WHERE id = $1 AND user_id = $2 RETURNING ${COLS}`,
      params,
    );
    if (row) enqueueTts([...(row.sub_questions ?? []), row.question_text]);
    return row ? toClient(row) : reply.code(404).send({ code: 404, message: "Not found" });
  });

  // Savol ishlatildi — cooldown uchun last_used = now()
  app.post("/api/questions/:id/use", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await one<QuestionRow>(
      `UPDATE questions SET last_used = now() WHERE id = $1 AND user_id = $2 RETURNING ${COLS}`,
      [id, userId(req)],
    );
    return row ? toClient(row) : reply.code(404).send({ code: 404, message: "Not found" });
  });

  // Barcha savollar cooldown'ini tiklash
  app.post("/api/questions/reset-cooldowns", { preHandler: requireAuth }, async (req) => {
    const rows = await query("UPDATE questions SET last_used = NULL WHERE user_id = $1 RETURNING id", [userId(req)]);
    return { ok: true, count: rows.length };
  });

  app.delete("/api/questions/:id", { preHandler: requireFullAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const rows = await query("DELETE FROM questions WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId(req)]);
    return rows.length ? reply.code(204).send() : reply.code(404).send({ code: 404, message: "Not found" });
  });
}

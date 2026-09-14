import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { one, query } from "../db.js";
import { publicUser, verifyPassword, USER_COLUMNS, type AuthUserRow, type JwtPayload } from "../auth.js";
import { config } from "../config.js";

const loginSchema = z.object({ password: z.string().min(1).max(200) });

/**
 * Imtihon stansiyasi (cefr.edumock.uz): tashkilotchi Ro'yxat sozlamalarida o'rnatgan parol bilan kiriladi.
 * Token cheklangan (station: true) — faqat mock test, yozuvlar va o'quvchi qidiruvi ishlaydi.
 */
export async function stationRoutes(app: FastifyInstance) {
  app.post("/api/station/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid input" });

    // Parol yagona (o'rnatishda tekshiriladi) — barcha yoqilgan stansiyalar bo'yicha solishtiramiz
    const rows = await query<{ user_id: string; station_password_hash: string; center_name: string }>(
      "SELECT user_id, station_password_hash, center_name FROM registration_settings WHERE station_enabled AND station_password_hash IS NOT NULL",
    );
    let match: { user_id: string; center_name: string } | null = null;
    for (const r of rows) {
      if (await verifyPassword(parsed.data.password, r.station_password_hash)) {
        match = r;
        break;
      }
    }
    if (!match) return reply.code(400).send({ code: 400, message: "Invalid password" });

    const user = await one<AuthUserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [match.user_id]);
    if (!user || user.blocked) return reply.code(403).send({ code: 403, message: "Account is blocked" });

    const token = await reply.jwtSign({ sub: user.id, role: "user", station: true } satisfies JwtPayload, {
      expiresIn: config.stationTokenExpiresIn,
    });
    return { token, record: publicUser(user), station: { center_name: match.center_name } };
  });
}

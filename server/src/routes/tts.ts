import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../auth.js";
import { ttsBackfill, ttsPhrases, ttsRebuildAll, ttsStatus } from "../tts.js";

/**
 * Imtihonchi ovozi (Piper):
 *  - GET  /api/tts/phrases  — test davomidagi doimiy iboralar URL'lari (mehmon rejimi uchun ham ochiq)
 *  - GET  /api/tts/status   — holat (yoqilganmi, ovoz, tayyor/navbatdagi soni)
 *  - POST /api/tts/rebuild  — (developer) yetishmaganlarni sintez qilish; ?force=1 — hammasini qaytadan
 */
export async function ttsRoutes(app: FastifyInstance) {
  app.get("/api/tts/phrases", async () => {
    const st = await ttsStatus();
    return { enabled: st.enabled, voice: st.voice, phrases: ttsPhrases() };
  });

  app.get("/api/tts/status", async () => ttsStatus());

  app.post("/api/tts/rebuild", { preHandler: requireAdmin }, async (req) => {
    const force = (req.query as { force?: string }).force === "1";
    if (force) await ttsRebuildAll();
    else await ttsBackfill();
    return ttsStatus();
  });
}

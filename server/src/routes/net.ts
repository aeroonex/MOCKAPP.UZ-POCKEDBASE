import type { FastifyInstance } from "fastify";
import type { Readable } from "node:stream";

/** Yuklash tezligi sinovi uchun maksimal hajm */
const MAX_TEST_BYTES = 4 * 1024 * 1024;

/**
 * Tarmoq tekshiruvi (test oldidan "qurilma tekshiruvi" uchun):
 *  - GET  /api/net/ping        — kechikishni o'lchash
 *  - POST /api/net/upload-test — mijoz tasodifiy ma'lumot yuboradi, server baytlarni sanab tashlab yuboradi
 * Avtorizatsiya talab qilinmaydi (mehmon rejimi ham tekshira oladi), lekin alohida rate-limit bor.
 */
export async function netRoutes(app: FastifyInstance) {
  app.get("/api/net/ping", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async () => ({ t: Date.now() }));

  app.post(
    "/api/net/upload-test",
    { bodyLimit: MAX_TEST_BYTES + 1024, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const body = req.body as Readable | undefined;
      if (!body || typeof body.pipe !== "function") {
        return reply.code(400).send({ code: 400, message: "Binary body expected" });
      }
      const started = Date.now();
      let bytes = 0;
      for await (const chunk of body) {
        bytes += (chunk as Buffer).length;
        if (bytes > MAX_TEST_BYTES) {
          body.destroy();
          return reply.code(413).send({ code: 413, message: "Too large" });
        }
      }
      return { bytes, ms: Date.now() - started };
    },
  );
}

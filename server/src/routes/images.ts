import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { one } from "../db.js";
import { requireAuth, userId } from "../auth.js";
import { config } from "../config.js";
import { FileTooLargeError, publicUrl, relPath, removeFile, streamToFile } from "../storage.js";

const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export async function imageRoutes(app: FastifyInstance) {
  // Savol rasmi yuklash (multipart: file)
  app.post("/api/images", { preHandler: requireAuth }, async (req, reply) => {
    const part = await req.file({ limits: { fileSize: config.maxImageBytes } });
    if (!part) return reply.code(400).send({ code: 400, message: "No file uploaded" });

    const ext = ALLOWED[part.mimetype];
    if (!ext) return reply.code(400).send({ code: 400, message: "Unsupported image type" });

    const uid = userId(req);
    const rel = relPath("images", uid, `${randomUUID()}.${ext}`);

    let size = 0;
    try {
      size = await streamToFile(part.file, rel, config.maxImageBytes);
    } catch (err) {
      if (err instanceof FileTooLargeError || part.file.truncated) {
        return reply.code(413).send({ code: 413, message: "Image is too large" });
      }
      throw err;
    }

    const row = await one<{ id: string }>(
      "INSERT INTO images (user_id, path, size_bytes, mime) VALUES ($1, $2, $3, $4) RETURNING id",
      [uid, rel, size, part.mimetype],
    );
    return reply.code(201).send({ id: row!.id, url: publicUrl(rel), size_bytes: size, mime: part.mimetype });
  });

  app.delete("/api/images/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await one<{ path: string }>(
      "DELETE FROM images WHERE id = $1 AND user_id = $2 RETURNING path",
      [id, userId(req)],
    );
    if (!row) return reply.code(404).send({ code: 404, message: "Not found" });
    await removeFile(row.path);
    return reply.code(204).send();
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { one, query } from "../db.js";
import { requireAdmin, requireAuth, requireFullAuth, userId, publicUser, USER_COLUMNS, type AuthUserRow } from "../auth.js";
import { config } from "../config.js";
import { FileTooLargeError, absPath, publicUrl, relPath, removeFile, streamToFile } from "../storage.js";
import { notifyNewPayment } from "../admin-bot.js";

export interface BillingSettingsRow {
  amount: number;
  card_number: string;
  card_holder: string;
  /** To'lov QR kodi havolasi (Paynet/Click/Payme). Bo'sh bo'lsa karta raqami ko'rsatiladi. */
  qr_url: string;
  period_days: number;
  remind_days: number;
  note: string;
  updated: Date;
}

interface PaymentRow {
  id: string;
  user_id: string;
  amount: number;
  receipt_path: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string;
  reviewed_at: Date | null;
  paid_until_after: Date | null;
  created: Date;
}

const PAY_COLS = "id, user_id, amount, receipt_path, note, status, admin_note, reviewed_at, paid_until_after, created";

/**
 * To'lovni tasdiqlash/rad etish (HTTP handler ham, Telegram bot ham ishlatadi).
 * Tasdiqlashda paid_until = max(hozir, joriy) + period_days ga uzayadi.
 */
export async function reviewPayment(
  id: string,
  status: "approved" | "rejected",
  adminNote: string,
  reviewedBy: string | null,
): Promise<{ ok: boolean; reason?: "not_found" | "already"; paidUntil?: Date | null; userId?: string }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, reason: "not_found" };
  }
  // ATOMIK: faqat 'pending' holatdan o'tkazamiz. Shu tufayli bot va admin panel bir
  // vaqtda tasdiqlasa ham obuna IKKI marta uzaymaydi (avval SELECT qilib, keyin
  // UPDATE qilinganda shunday bo'lishi mumkin edi).
  const claimed = await one<{ id: string; user_id: string }>(
    `UPDATE payments SET status = $2, admin_note = $3, reviewed_at = now(), reviewed_by = $4
     WHERE id = $1 AND status = 'pending' RETURNING id, user_id`,
    [id, status, adminNote, reviewedBy],
  );
  if (!claimed) {
    const exists = await one<{ id: string }>("SELECT id FROM payments WHERE id = $1", [id]);
    return { ok: false, reason: exists ? "already" : "not_found" };
  }
  let paidUntilAfter: Date | null = null;
  if (status === "approved") {
    const st = await getBillingSettings();
    const u = await one<{ paid_until: Date | null }>(
      `UPDATE users SET paid_until = GREATEST(COALESCE(paid_until, now()), now()) + make_interval(days => $2) WHERE id = $1 RETURNING paid_until`,
      [claimed.user_id, Number(st.period_days)],
    );
    paidUntilAfter = u?.paid_until ?? null;
    await query("UPDATE payments SET paid_until_after = $2 WHERE id = $1", [id, paidUntilAfter]);
  }
  return { ok: true, paidUntil: paidUntilAfter, userId: claimed.user_id };
}

export async function getBillingSettings(): Promise<BillingSettingsRow> {
  const row = await one<BillingSettingsRow>(
    "SELECT amount, card_number, card_holder, qr_url, period_days, remind_days, note, updated FROM billing_settings WHERE id = 1",
  );
  return row ?? { amount: 0, card_number: "", card_holder: "", qr_url: "", period_days: 30, remind_days: 5, note: "", updated: new Date() };
}

function paymentToClient(p: PaymentRow) {
  return {
    id: p.id,
    user_id: p.user_id,
    amount: Number(p.amount),
    receipt_url: publicUrl(p.receipt_path),
    note: p.note,
    status: p.status,
    admin_note: p.admin_note,
    reviewed_at: p.reviewed_at,
    paid_until_after: p.paid_until_after,
    created: p.created,
  };
}

/** Foydalanuvchi obuna holati: developer — doim faol */
export function accessOf(u: { role: string; blocked: boolean; paid_until: Date | null }, remindDays = 5) {
  if (u.role === "developer") return { active: true, blocked: false, expired: false, days_left: null as number | null, paid_until: null as Date | null };
  const until = u.paid_until ? new Date(u.paid_until) : null;
  const msLeft = until ? until.getTime() - Date.now() : -1;
  const daysLeft = until ? Math.ceil(msLeft / 86_400_000) : null;
  const expired = !until || msLeft <= 0;
  return { active: !u.blocked && !expired, blocked: u.blocked, expired, days_left: daysLeft, paid_until: until, remind: !expired && daysLeft !== null && daysLeft <= remindDays };
}

const settingsSchema = z.object({
  amount: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  card_number: z.string().trim().max(32).transform((v) => v.replace(/\s/g, "")).optional(),
  card_holder: z.string().trim().max(120).optional(),
  // QR: https:// havola (Paynet "ulashish" havolasi) yoki to'g'ridan-to'g'ri
  // EMVCo to'lov kodi (000201...). Bo'sh bo'lsa — karta raqami rejimi.
  qr_url: z
    .string()
    .trim()
    .max(2000)
    .refine(
      (v) => v === "" || /^https:\/\/[^\s]+$/i.test(v) || /^000201\S+$/.test(v),
      "QR: https:// havola yoki 000201... to'lov kodi bo'lishi kerak",
    )
    .optional(),
  period_days: z.coerce.number().int().min(1).max(3650).optional(),
  remind_days: z.coerce.number().int().min(0).max(365).optional(),
  note: z.string().trim().max(500).optional(),
});

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  admin_note: z.string().trim().max(500).optional().default(""),
});

export async function billingRoutes(app: FastifyInstance) {
  // ---- Foydalanuvchi: holat, rekvizitlar, so'rovlar tarixi ----
  app.get("/api/billing", { preHandler: requireAuth }, async (req, reply) => {
    const uid = userId(req);
    const u = await one<{ role: string; blocked: boolean; paid_until: Date | null }>("SELECT role, blocked, paid_until FROM users WHERE id = $1", [uid]);
    if (!u) return reply.code(401).send({ code: 401, message: "Unauthorized" });
    const st = await getBillingSettings();
    const payments = await query<PaymentRow>(`SELECT ${PAY_COLS} FROM payments WHERE user_id = $1 ORDER BY created DESC LIMIT 20`, [uid]);
    return {
      settings: { amount: Number(st.amount), card_number: st.card_number, card_holder: st.card_holder, qr_url: st.qr_url || "", period_days: Number(st.period_days), remind_days: Number(st.remind_days), note: st.note },
      access: accessOf(u, Number(st.remind_days)),
      pending: payments.find((p) => p.status === "pending") ? paymentToClient(payments.find((p) => p.status === "pending")!) : null,
      history: payments.map(paymentToClient),
    };
  });

  // ---- Foydalanuvchi: chek yuborish (multipart: note?, receipt) ----
  app.post("/api/billing/payments", { preHandler: requireFullAuth, bodyLimit: config.maxImageBytes + 1024 * 1024 }, async (req, reply) => {
    const uid = userId(req);
    const existing = await one("SELECT 1 FROM payments WHERE user_id = $1 AND status = 'pending'", [uid]);
    if (existing) return reply.code(409).send({ code: 409, message: "A payment is already pending review" });

    const fields: Record<string, string> = {};
    let rel: string | null = null;
    try {
      for await (const part of req.parts({ limits: { fileSize: config.maxImageBytes } })) {
        if (part.type !== "file") {
          fields[part.fieldname] = String(part.value ?? "");
          continue;
        }
        if (part.fieldname !== "receipt" || rel) {
          part.file.resume();
          continue;
        }
        const ext = part.mimetype === "image/png" ? "png" : part.mimetype === "application/pdf" ? "pdf" : part.mimetype === "image/webp" ? "webp" : "jpg";
        if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(part.mimetype)) {
          part.file.resume();
          return reply.code(400).send({ code: 400, message: "Only JPG, PNG, WEBP or PDF receipts" });
        }
        rel = relPath("billing", uid, `${Date.now()}.${ext}`);
        await streamToFile(part.file, rel, config.maxImageBytes);
      }
    } catch (err) {
      if (rel) await removeFile(rel);
      if (err instanceof FileTooLargeError) return reply.code(413).send({ code: 413, message: "Receipt is too large" });
      throw err;
    }
    if (!rel) return reply.code(400).send({ code: 400, message: "Receipt file is required" });

    const st = await getBillingSettings();
    let row: PaymentRow | null;
    try {
      row = await one<PaymentRow>(
        `INSERT INTO payments (user_id, amount, receipt_path, note) VALUES ($1, $2, $3, $4) RETURNING ${PAY_COLS}`,
        [uid, Number(st.amount), rel, (fields.note || "").slice(0, 500)],
      );
    } catch (err) {
      // uq_payments_one_pending — bir vaqtda ikki so'rov kelsa ikkinchisi shu yerda to'xtaydi
      await removeFile(rel);
      if ((err as { code?: string }).code === "23505") {
        return reply.code(409).send({ code: 409, message: "A payment is already pending review" });
      }
      throw err;
    }
    // Superadmin botiga chek + Tasdiqlash/Rad etish tugmalari bilan
    void (async () => {
      const u = await one<{ name: string; email: string; username: string }>(
        "SELECT COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), username) AS name, email, username FROM users WHERE id = $1",
        [uid],
      ).catch(() => null);
      notifyNewPayment({
        paymentId: row!.id,
        userName: u?.name || u?.username || "—",
        email: u?.email || "",
        amount: Number(row!.amount),
        note: row!.note,
        receiptAbsPath: absPath(rel!),
        isPdf: rel!.endsWith(".pdf"),
      });
    })();
    return reply.code(201).send(paymentToClient(row!));
  });

  // ---- Admin: billing sozlamalari ----
  app.get("/api/admin/billing/settings", { preHandler: requireAdmin }, async () => getBillingSettings());
  app.put("/api/admin/billing/settings", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = settingsSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid input", data: parsed.error.flatten() });
    const d = parsed.data;
    await query(
      `UPDATE billing_settings SET
         amount = COALESCE($1, amount), card_number = COALESCE($2, card_number), card_holder = COALESCE($3, card_holder),
         period_days = COALESCE($4, period_days), remind_days = COALESCE($5, remind_days), note = COALESCE($6, note),
         qr_url = COALESCE($7, qr_url), updated = now()
       WHERE id = 1`,
      [d.amount ?? null, d.card_number ?? null, d.card_holder ?? null, d.period_days ?? null, d.remind_days ?? null, d.note ?? null, d.qr_url ?? null],
    );
    return getBillingSettings();
  });

  // ---- Admin: to'lov so'rovlari ----
  app.get("/api/admin/payments", { preHandler: requireAdmin }, async (req) => {
    const q = req.query as { status?: string };
    const status = ["pending", "approved", "rejected"].includes(q.status || "") ? q.status : null;
    const rows = await query<PaymentRow & { email: string; username: string; first_name: string; last_name: string; paid_until: Date | null }>(
      `SELECT p.id, p.user_id, p.amount, p.receipt_path, p.note, p.status, p.admin_note, p.reviewed_at, p.paid_until_after, p.created,
              u.email, u.username, u.first_name, u.last_name, u.paid_until
       FROM payments p JOIN users u ON u.id = p.user_id
       ${status ? "WHERE p.status = $1" : ""}
       ORDER BY (p.status = 'pending') DESC, p.created DESC LIMIT 300`,
      status ? [status] : [],
    );
    return rows.map((r) => ({
      ...paymentToClient(r),
      user: { email: r.email, username: r.username, name: `${r.first_name} ${r.last_name}`.trim(), paid_until: r.paid_until },
    }));
  });

  // Tasdiqlash → paid_until = max(hozir, joriy) + period_days; rad etish → faqat holat
  app.patch("/api/admin/payments/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = reviewSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid input" });
    const res = await reviewPayment(id, parsed.data.status, parsed.data.admin_note, userId(req));
    if (!res.ok) {
      if (res.reason === "not_found") return reply.code(404).send({ code: 404, message: "Not found" });
      return reply.code(409).send({ code: 409, message: "Already reviewed" });
    }
    const row = await one<PaymentRow>(`SELECT ${PAY_COLS} FROM payments WHERE id = $1`, [id]);
    return paymentToClient(row!);
  });

  // Admin: foydalanuvchi obuna muddatini qo'lda belgilash (YYYY-MM-DD yoki null)
  app.patch("/api/admin/users/:id/access", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ paid_until: z.string().datetime().nullable().optional(), add_days: z.coerce.number().int().min(-3650).max(3650).optional() }).safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ code: 400, message: "Invalid input" });
    let row: AuthUserRow | null = null;
    if (body.data.paid_until !== undefined) {
      row = await one<AuthUserRow>(`UPDATE users SET paid_until = $2 WHERE id = $1 RETURNING ${USER_COLUMNS}`, [id, body.data.paid_until]);
    } else if (body.data.add_days !== undefined) {
      row = await one<AuthUserRow>(
        `UPDATE users SET paid_until = GREATEST(COALESCE(paid_until, now()), now()) + make_interval(days => $2) WHERE id = $1 RETURNING ${USER_COLUMNS}`,
        [id, body.data.add_days],
      );
    } else {
      return reply.code(400).send({ code: 400, message: "Nothing to update" });
    }
    return row ? publicUser(row) : reply.code(404).send({ code: 404, message: "Not found" });
  });
}

import { Bot, InlineKeyboard, InputFile } from "grammy";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { config } from "./config.js";
import { one, query } from "./db.js";
import { loginPhotoAbs } from "./sessions.js";
import { reviewPayment } from "./routes/billing.js";

const fmtSum = (n: number) => `${new Intl.NumberFormat("uz-UZ").format(n)} so'm`;
const fmtDate = (d: Date | null | undefined) => {
  if (!d) return "—";
  const t = new Date(new Date(d).getTime() + 5 * 60 * 60 * 1000);
  return `${String(t.getUTCDate()).padStart(2, "0")}.${String(t.getUTCMonth() + 1).padStart(2, "0")}.${t.getUTCFullYear()}`;
};

/**
 * Superadmin bildirishnoma boti: kim kirdi/chiqdi, kim yangi savol qo'shdi — login rasmlari bilan.
 * Faqat magic link orqali ulangan chatlar uchun ishlaydi (boshqalarga javob bermaydi).
 * Alohida token (ADMIN_BOT_TOKEN) — tashkilotchilarning botlaridan mustaqil.
 */

let bot: Bot | null = null;
let botUsername = "";

const esc = (s: string) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] || c);

async function boundChats(): Promise<number[]> {
  const rows = await query<{ chat_id: string }>("SELECT chat_id FROM admin_bot_chats");
  return rows.map((r) => Number(r.chat_id));
}

/** Ulangan barcha admin chatlarga matn (ixtiyoriy rasm/tugmalar bilan) yuboradi. */
export async function notifyAdmins(
  text: string,
  opts?: { photoAbsPath?: string | null; docAbsPath?: string | null; keyboard?: InlineKeyboard },
): Promise<void> {
  if (!bot) return;
  const chats = await boundChats();
  if (!chats.length) return;
  const photo = opts?.photoAbsPath && fs.existsSync(opts.photoAbsPath) ? opts.photoAbsPath : null;
  const doc = opts?.docAbsPath && fs.existsSync(opts.docAbsPath) ? opts.docAbsPath : null;
  for (const chatId of chats) {
    try {
      const extra = { parse_mode: "HTML" as const, reply_markup: opts?.keyboard };
      if (photo) await bot.api.sendPhoto(chatId, new InputFile(photo), { caption: text, ...extra });
      else if (doc) await bot.api.sendDocument(chatId, new InputFile(doc), { caption: text, ...extra });
      else await bot.api.sendMessage(chatId, text, { ...extra, link_preview_options: { is_disabled: true } });
    } catch (e) {
      console.error("[admin-bot] yuborish xato:", e instanceof Error ? e.message : e);
    }
  }
}

/** Bir martalik magic token yaratadi va ulanish havolasini qaytaradi. */
export async function createAdminBotLink(): Promise<string | null> {
  if (!bot || !botUsername) return null;
  const token = randomBytes(24).toString("base64url");
  await query("INSERT INTO admin_bot_tokens (token) VALUES ($1)", [token]);
  return `https://t.me/${botUsername}?start=${token}`;
}

/** Botni ishga tushiradi (uzoq so'rov). Token bo'lmasa — jim o'tkazadi. */
export async function startAdminBot(): Promise<void> {
  if (!config.adminBotToken) {
    console.log("[admin-bot] ADMIN_BOT_TOKEN yo'q — bot o'chiq");
    return;
  }
  try {
    bot = new Bot(config.adminBotToken);
    const me = await bot.api.getMe();
    botUsername = me.username;

    bot.command("start", async (ctx) => {
      const token = (ctx.match || "").trim();
      const chatId = ctx.chat.id;
      const already = await one("SELECT 1 FROM admin_bot_chats WHERE chat_id = $1", [chatId]);
      if (already) {
        await ctx.reply("✅ Siz allaqachon ulangansiz. Bildirishnomalar shu yerga keladi.\n\n/online — hozir kim onlayn\n/stop — uzish");
        return;
      }
      if (!token) {
        await ctx.reply("⛔️ Ruxsat yo'q. Bu bot faqat superadmin uchun. Ulanish havolasi (magic link) orqali kiring.");
        return;
      }
      const row = await one<{ token: string; used_at: Date | null }>("SELECT token, used_at FROM admin_bot_tokens WHERE token = $1", [token]);
      if (!row || row.used_at) {
        await ctx.reply("⛔️ Havola yaroqsiz yoki allaqachon ishlatilgan. Yangi havola so'rang.");
        return;
      }
      await query("UPDATE admin_bot_tokens SET used_at = now() WHERE token = $1", [token]);
      const title = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ") || ctx.from?.username || "";
      await query(
        "INSERT INTO admin_bot_chats (chat_id, title) VALUES ($1, $2) ON CONFLICT (chat_id) DO UPDATE SET title = EXCLUDED.title",
        [chatId, title],
      );
      await ctx.reply("✅ Ulandingiz! Endi kirish/chiqish, yangi savollar va login rasmlari shu yerga keladi.\n\n/online — hozir kim onlayn\n/stop — bildirishnomalarni uzish");
    });

    // Bog'lanmagan chatlar hech narsa qila olmaydi
    const requireBound = async (ctx: { chat: { id: number }; reply: (t: string) => Promise<unknown> }): Promise<boolean> => {
      const ok = await one("SELECT 1 FROM admin_bot_chats WHERE chat_id = $1", [ctx.chat.id]);
      if (!ok) {
        await ctx.reply("⛔️ Ruxsat yo'q.");
        return false;
      }
      return true;
    };

    bot.command("stop", async (ctx) => {
      if (!(await requireBound(ctx))) return;
      await query("DELETE FROM admin_bot_chats WHERE chat_id = $1", [ctx.chat.id]);
      await ctx.reply("🔕 Uzildi. Qayta ulanish uchun magic link kerak.");
    });

    bot.command("online", async (ctx) => {
      if (!(await requireBound(ctx))) return;
      const rows = await query<{ name: string; panel: string; city: string; country: string; device: string; last_seen: Date }>(
        `SELECT COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.username) AS name,
                s.panel, s.city, s.country, s.device, s.last_seen
         FROM auth_sessions s JOIN users u ON u.id = s.user_id
         WHERE s.ended_at IS NULL AND s.last_seen > now() - interval '5 minutes'
         ORDER BY s.last_seen DESC LIMIT 30`,
      );
      if (!rows.length) {
        await ctx.reply("Hozir hech kim onlayn emas.");
        return;
      }
      const panelUz: Record<string, string> = { dashboard: "Asosiy", station: "Stansiya", admin: "Admin" };
      const lines = rows.map(
        (r) => `🟢 <b>${esc(r.name)}</b> — ${panelUz[r.panel] || r.panel}\n   ${esc([r.city, r.country].filter(Boolean).join(", ") || "—")} · ${esc(r.device)}`,
      );
      await ctx.reply(`<b>Hozir onlayn (${rows.length}):</b>\n\n${lines.join("\n")}`, { parse_mode: "HTML" });
    });

    // To'lov tugmalari: Tasdiqlash / Rad etish
    bot.on("callback_query:data", async (ctx) => {
      const data = ctx.callbackQuery.data;
      const m = /^pay:(a|r):(.+)$/.exec(data);
      if (!m) return void ctx.answerCallbackQuery().catch(() => undefined);
      const chatId = ctx.chat?.id;
      if (!chatId || !(await one("SELECT 1 FROM admin_bot_chats WHERE chat_id = $1", [chatId]))) {
        return void ctx.answerCallbackQuery({ text: "Ruxsat yo'q", show_alert: true }).catch(() => undefined);
      }
      const status = m[1] === "a" ? "approved" : "rejected";
      const res = await reviewPayment(m[2], status, m[1] === "a" ? "Telegram orqali" : "Telegram orqali rad etildi", null).catch(() => ({ ok: false as const, reason: "not_found" as const }));
      let note: string;
      if (!res.ok) note = res.reason === "already" ? "⚠️ Bu to'lov allaqachon ko'rilgan." : "❌ Topilmadi.";
      else if (status === "approved") note = `✅ <b>Tasdiqlandi</b> — obuna ${fmtDate(res.paidUntil)} gacha uzaytirildi.`;
      else note = "❌ <b>Rad etildi.</b>";
      await ctx.answerCallbackQuery({ text: res.ok ? "Bajarildi" : "Amalga oshmadi" }).catch(() => undefined);
      // Xabar ostiga natijani qo'shamiz va tugmalarni olib tashlaymiz
      const cap = ctx.callbackQuery.message && "caption" in ctx.callbackQuery.message ? ctx.callbackQuery.message.caption || "" : "";
      await ctx.editMessageCaption({ caption: `${cap}\n\n${note}`, parse_mode: "HTML" }).catch(async () => {
        await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
        await ctx.reply(note, { parse_mode: "HTML" }).catch(() => undefined);
      });
    });

    bot.catch((err) => console.error("[admin-bot] xato:", err.error instanceof Error ? err.error.message : err.error));
    void bot.start({ onStart: () => console.log(`[admin-bot] ishga tushdi: @${botUsername}`) });
  } catch (e) {
    console.error("[admin-bot] ishga tushmadi:", e instanceof Error ? e.message : e);
    bot = null;
  }
}

// ---------- Hodisa bildirishnomalari (ilova chaqiradi) ----------

const PANEL_UZ: Record<string, string> = { dashboard: "Asosiy panel", station: "Imtihon stansiyasi", admin: "Admin panel" };

/** Kirish bildirishnomasi — login rasmi bilan (rasm biroz kechroq kelgani uchun kechikish bilan). */
export function notifyLogin(sessionId: string): void {
  if (!config.adminBotToken) return;
  setTimeout(() => void sendLoginNotice(sessionId).catch(() => undefined), 6000);
}

async function sendLoginNotice(sessionId: string): Promise<void> {
  const s = await one<{ name: string; panel: string; city: string; country: string; device: string; ip: string; photo_path: string }>(
    `SELECT COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.username) AS name,
            s.panel, s.city, s.country, s.device, s.ip, s.photo_path
     FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
    [sessionId],
  );
  if (!s) return;
  const loc = [s.city, s.country].filter(Boolean).join(", ") || "—";
  const text =
    `🟢 <b>Kirish</b>\n` +
    `👤 ${esc(s.name)}\n` +
    `🖥 ${esc(PANEL_UZ[s.panel] || s.panel)}\n` +
    `📍 ${esc(loc)}\n` +
    `💻 ${esc(s.device)}${s.ip ? ` · <code>${esc(s.ip)}</code>` : ""}`;
  await notifyAdmins(text, { photoAbsPath: s.photo_path ? loginPhotoAbs(s.photo_path) : null });
}

/** Yangi to'lov keldi — chek (rasm/PDF) + Tasdiqlash/Rad etish tugmalari. */
export function notifyNewPayment(info: {
  paymentId: string;
  userName: string;
  email: string;
  amount: number;
  note: string;
  receiptAbsPath: string;
  isPdf: boolean;
}): void {
  if (!config.adminBotToken) return;
  const text =
    `💳 <b>Yangi to'lov</b>\n` +
    `👤 ${esc(info.userName)}${info.email ? ` · ${esc(info.email)}` : ""}\n` +
    `💰 <b>${esc(fmtSum(info.amount))}</b>` +
    (info.note ? `\n📝 ${esc(info.note.slice(0, 200))}` : "");
  const kb = new InlineKeyboard()
    .text("✅ Tasdiqlash", `pay:a:${info.paymentId}`)
    .text("❌ Rad etish", `pay:r:${info.paymentId}`);
  void notifyAdmins(text, info.isPdf ? { docAbsPath: info.receiptAbsPath, keyboard: kb } : { photoAbsPath: info.receiptAbsPath, keyboard: kb }).catch(() => undefined);
}

/** Chiqish bildirishnomasi. */
export function notifyLogout(name: string, panel: string): void {
  if (!config.adminBotToken) return;
  void notifyAdmins(`🔴 <b>Chiqish</b>\n👤 ${esc(name)} — ${esc(PANEL_UZ[panel] || panel)}`).catch(() => undefined);
}

/** Yangi savol qo'shildi. */
export function notifyNewQuestion(userName: string, type: string, preview: string): void {
  if (!config.adminBotToken) return;
  const p = preview ? `\n📝 ${esc(preview.slice(0, 120))}` : "";
  void notifyAdmins(`❓ <b>Yangi savol</b>\n👤 ${esc(userName)}\n🏷 ${esc(type)}${p}`).catch(() => undefined);
}

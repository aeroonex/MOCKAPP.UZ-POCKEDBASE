/**
 * CEFR mock imtihoniga ro'yxatdan o'tish Telegram boti (grammY, long polling).
 *
 * Oqim: /start [reg_code] → ism → telefon → o'quv markaz → chek rasmi → to'lov vaqti → tasdiqlash.
 * Bepul rejimda (free_mode) chek va to'lov vaqti qadamlari o'tkazib yuboriladi.
 * Suhbat holati bot_sessions jadvalida saqlanadi (server qayta ishga tushsa ham yo'qolmaydi).
 * Har bir tashkilotchi O'Z botini (BotFather token) ulaydi — shu botga /start bilan kirgan har kim avtomatik
 * o'sha tashkilotchiga bog'lanadi (deep-link kerak emas). Tizim bir vaqtda ko'p botni yuritadi (bots registry).
 *
 * Admin panel: /start adm_<admin_code> — shu chat tashkilotchining "zaxira" chati bo'ladi:
 * har bir yuklangan Speaking videosi ma'lumotlari bilan shu yerga yuboriladi (backupRecordingToTelegram).
 */
import { Readable } from "node:stream";
import fsp from "node:fs/promises";
import { Bot, GrammyError, HttpError, InlineKeyboard, InputFile, Keyboard, type Context } from "grammy";
import { config } from "./config.js";
import { integritySummaryHtml } from "./integrity.js";
import { buildResultPdf } from "./results-pdf.js";
import { one, query } from "./db.js";
import { absPath, publicUrl, relPath, streamToFile, FileTooLargeError } from "./storage.js";
import {
  countedSkills,
  createRegistration,
  listBotAdmins,
  redeemAdminInvite,
  findSettingsByUser,
  formatCard,
  formatSeq,
  formatSum,
  listRegistrationsByTelegram,
  missingSkills,
  normalizePhone,
  overallScore,
  skillScore,
  skillSkipped,
  REG_WITH_SPEAKING_SELECT,
  SKILLS,
  SKILL_EMOJI,
  SKILL_LABEL,
  type RegistrationRow,
  type RegistrationWithSpeaking,
  type SettingsRow,
} from "./registrations.js";

type Step = "idle" | "name" | "phone" | "center" | "teacher" | "receipt" | "pay_time" | "confirm";

interface SessionData {
  full_name?: string;
  phone?: string;
  center_name?: string;
  teacher_name?: string;
  receipt_path?: string;
  receipt_sent_at?: string;
  payment_time?: string;
}

interface Session {
  owner_id: string; // bot egasi (tashkilotchi)
  chat_id: number;
  user_id: string | null;
  step: Step;
  data: SessionData;
}

const MAX_RECEIPT_BYTES = 20 * 1024 * 1024; // Telegram getFile chegarasi ham 20 MB
const TG_MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // Bot API orqali yuborish chegarasi
const ADMIN_PREFIX = "adm_";

// ---- Tugma matnlari (reply keyboard orqali kelgan matnlarni aniqlash uchun) ----
const BTN_CANCEL = "❌ Bekor qilish";
const BTN_SHARE_PHONE = "📲 Raqamni ulashish";
const BTN_SELF_STUDY = "🎓 Mustaqil o'qiyman";
const BTN_PAID_NOW = "⏰ Hozirgina to'ladim";
const BTN_NO_TEACHER = "🙅 Ustozim yo'q";

interface BotInstance {
  bot: Bot;
  token: string;
  username: string;
  ownerId: string;
}

/** Ishlayotgan botlar: tashkilotchi (user id) → bot */
const bots = new Map<string, BotInstance>();

export function getBotFor(ownerId: string): BotInstance | undefined {
  return bots.get(ownerId);
}

export function getBotUsername(ownerId: string): string {
  return bots.get(ownerId)?.username || "";
}

export function isBotRunning(ownerId: string): boolean {
  return bots.has(ownerId);
}

// ------------------------------------------------------------------ yordamchilar

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Toshkent vaqti: "13.09.2026 15:19" */
export function formatTashkent(d: Date): string {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;
}

const STATUS_LABEL: Record<RegistrationRow["status"], string> = {
  pending: "⏳ Ko'rib chiqilmoqda",
  approved: "✅ Tasdiqlangan",
  rejected: "❌ Rad etilgan",
};

const kbCancel = () => new Keyboard().text(BTN_CANCEL).resized();
const kbPhone = () => new Keyboard().requestContact(BTN_SHARE_PHONE).row().text(BTN_CANCEL).resized();
const kbCenter = () => new Keyboard().text(BTN_SELF_STUDY).row().text(BTN_CANCEL).resized();
const kbPayTime = () => new Keyboard().text(BTN_PAID_NOW).row().text(BTN_CANCEL).resized();
const kbTeacher = () => new Keyboard().text(BTN_NO_TEACHER).row().text(BTN_CANCEL).resized();
const removeKb = { remove_keyboard: true as const };

// ------------------------------------------------------------------ sessiya

async function loadSession(ownerId: string, chatId: number): Promise<Session> {
  const row = await one<{ owner_id: string; chat_id: number; user_id: string | null; step: Step; data: SessionData }>(
    "SELECT owner_id, chat_id, user_id, step, data FROM bot_sessions WHERE owner_id = $1 AND chat_id = $2",
    [ownerId, chatId],
  );
  return row ?? { owner_id: ownerId, chat_id: chatId, user_id: ownerId, step: "idle", data: {} };
}

async function saveSession(s: Session): Promise<void> {
  await query(
    `INSERT INTO bot_sessions (owner_id, chat_id, user_id, step, data, updated) VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (owner_id, chat_id) DO UPDATE SET user_id = EXCLUDED.user_id, step = EXCLUDED.step, data = EXCLUDED.data, updated = now()`,
    [s.owner_id, s.chat_id, s.user_id, s.step, JSON.stringify(s.data)],
  );
}

/** Bot egasi — tashkilotchi sozlamalari (ro'yxatdan o'tish yoqilgan bo'lsa). */
async function organizerFor(s: Session): Promise<SettingsRow | null> {
  const st = await findSettingsByUser(s.owner_id);
  return st && st.enabled ? st : null;
}

// ------------------------------------------------------------------ xabarlar

function welcomeText(st: SettingsRow): string {
  const lines = [
    "👋 <b>Assalomu alaykum!</b>",
    "",
    `<b>${esc(st.center_name || "O'quv markaz")}</b> tomonidan o'tkaziladigan <b>CEFR Speaking mock imtihoniga</b> ro'yxatdan o'tish botiga xush kelibsiz.`,
    "",
    st.free_mode ? "🎁 Imtihon: <b>Bepul</b>" : `💰 Imtihon narxi: <b>${formatSum(st.exam_price)} so'm</b>`,
  ];
  if (st.exam_info) lines.push(`📅 ${esc(st.exam_info)}`);
  lines.push("", "Ro'yxatdan o'tish 2 daqiqa vaqt oladi. Boshlaymizmi?");
  return lines.join("\n");
}

const kbWelcome = () => new InlineKeyboard().text("📝 Ro'yxatdan o'tish", "reg:start").row().text("📋 Mening arizalarim", "reg:my");

async function sendWelcome(ctx: Context, st: SettingsRow) {
  await ctx.reply(welcomeText(st), { parse_mode: "HTML", reply_markup: kbWelcome() });
}

/** Bepul rejimda 4 qadam (to'lovsiz), aks holda 6. */
const totalSteps = (st: SettingsRow) => (st.free_mode ? 4 : 6);

async function askName(ctx: Context, st: SettingsRow) {
  await ctx.reply(
    `<b>1/${totalSteps(st)} · 👤 Ism va familiya</b>\n\nIsm va familiyangizni to'liq kiriting.\n<i>Misol: Abdulaziz Karimov</i>`,
    { parse_mode: "HTML", reply_markup: kbCancel() },
  );
}

async function askPhone(ctx: Context, st: SettingsRow) {
  await ctx.reply(
    `<b>2/${totalSteps(st)} · 📱 Telefon raqam</b>\n\nPastdagi tugma orqali raqamingizni ulashing yoki qo'lda kiriting.\n<i>Misol: +998 90 123 45 67</i>`,
    { parse_mode: "HTML", reply_markup: kbPhone() },
  );
}

async function askCenter(ctx: Context, st: SettingsRow) {
  await ctx.reply(
    `<b>3/${totalSteps(st)} · 🏫 O'quv markaz</b>\n\nHozir qaysi o'quv markazida o'qiysiz?\n<i>Misol: Younine Academy</i>`,
    { parse_mode: "HTML", reply_markup: kbCenter() },
  );
}

async function askTeacher(ctx: Context, st: SettingsRow) {
  await ctx.reply(
    `<b>4/${totalSteps(st)} · 👨‍🏫 Ustozingiz</b>\n\nSizga dars beradigan ustozingizning ism-familiyasini kiriting.\n<i>Misol: Dilnoza Karimova</i>`,
    { parse_mode: "HTML", reply_markup: kbTeacher() },
  );
}

async function askReceipt(ctx: Context, st: SettingsRow) {
  const lines = ["<b>5/6 · 💳 To'lov</b>", "", `Imtihon narxi: <b>${formatSum(st.exam_price)} so'm</b>`, ""];
  if (st.card_number) {
    lines.push(`💳 Karta: <code>${esc(formatCard(st.card_number))}</code>`);
    if (st.card_holder) lines.push(`👤 Egasi: ${esc(st.card_holder)}`);
    lines.push("<i>(karta raqamini bosib nusxalash mumkin)</i>", "");
  } else {
    lines.push("<i>To'lov rekvizitlarini tashkilotchidan so'rang.</i>", "");
  }
  lines.push("To'lovni amalga oshirib, <b>chek rasmini</b> (skrinshot) shu yerga yuboring.");
  if (st.receipt_minutes > 0) {
    lines.push("", `‼️ To'lovdan keyin <b>${st.receipt_minutes} daqiqa</b> ichida yuborilgan cheklar qabul qilinadi.`);
  }
  await ctx.reply(lines.join("\n"), { parse_mode: "HTML", reply_markup: kbCancel() });
}

async function askPayTime(ctx: Context) {
  await ctx.reply(
    `<b>6/6 · 🕐 To'lov vaqti</b>\n\nTo'lov amalga oshirilgan sana va vaqtni kiriting.\n<i>Misol: ${formatTashkent(new Date())}</i>`,
    { parse_mode: "HTML", reply_markup: kbPayTime() },
  );
}

async function askConfirm(ctx: Context, s: Session, st: SettingsRow) {
  const d = s.data;
  const text: string[] = [
    "<b>📋 Arizangizni tekshiring</b>",
    "",
    `👤 Ism: ${esc(d.full_name || "")}`,
    `📱 Telefon: ${esc(d.phone || "")}`,
    `🏫 Markaz: ${esc(d.center_name || "")}`,
    `👨‍🏫 Ustoz: ${esc(d.teacher_name || "—")}`,
    st.free_mode ? "🎁 Imtihon: Bepul" : `💰 Summa: ${formatSum(st.exam_price)} so'm`,
  ];
  if (!st.free_mode) {
    text.push(`🕐 To'lov vaqti: ${esc(d.payment_time || "")}`, `🧾 Chek: ${d.receipt_path ? "✅ yuborildi" : "—"}`);
  }
  text.push("", "Hammasi to'g'rimi?");
  const kb = new InlineKeyboard()
    .text("✅ Tasdiqlash", "confirm:yes")
    .row()
    .text("✏️ Qaytadan to'ldirish", "confirm:edit")
    .text("❌ Bekor qilish", "confirm:cancel");
  await ctx.reply(text.join("\n"), { parse_mode: "HTML", reply_markup: kb });
}

async function sendMyRegistrations(ctx: Context, ownerId: string) {
  const tgId = ctx.from?.id;
  if (!tgId) return;
  const rows = (await listRegistrationsByTelegram(tgId)).filter((r) => r.user_id === ownerId);
  if (!rows.length) {
    await ctx.reply("Sizda hali arizalar yo'q. Ro'yxatdan o'tish uchun /start ni bosing.", { reply_markup: removeKb });
    return;
  }
  const orgIds = [...new Set(rows.map((r) => r.user_id))];
  const orgs = await query<{ user_id: string; center_name: string }>(
    "SELECT user_id, center_name FROM registration_settings WHERE user_id = ANY($1::uuid[])",
    [orgIds],
  );
  const orgName = new Map(orgs.map((o) => [o.user_id, o.center_name]));
  const lines = ["<b>📋 Mening arizalarim</b>", ""];
  for (const r of rows) {
    lines.push(
      `<b>${formatSeq(r.seq)}</b> · ${STATUS_LABEL[r.status]}`,
      `   🏫 ${esc(orgName.get(r.user_id) || "")} · ${formatTashkent(new Date(r.created))}`,
    );
    if (r.status === "rejected" && r.note) lines.push(`   💬 ${esc(r.note)}`);
    lines.push("");
  }
  await ctx.reply(lines.join("\n").trim(), { parse_mode: "HTML", reply_markup: removeKb });
}

// ------------------------------------------------------------------ oqim

async function cancelFlow(ctx: Context, s: Session) {
  s.step = "idle";
  s.data = {};
  await saveSession(s);
  await ctx.reply("❌ Ariza bekor qilindi. Qaytadan boshlash uchun /start ni bosing.", { reply_markup: removeKb });
}

async function startRegistration(ctx: Context, s: Session) {
  const st = await organizerFor(s);
  if (!st) {
    await ctx.reply("⏸ Ro'yxatdan o'tish hozircha yopiq. Keyinroq urinib ko'ring.", { reply_markup: removeKb });
    return;
  }
  s.step = "name";
  s.data = {};
  await saveSession(s);
  await askName(ctx, st);
}

/** Admin panel: /start adm_<code> — bir martalik taklif; shu chat tashkilotchi adminlari ro'yxatiga qo'shiladi. */
async function connectAdmin(ctx: Context, ownerId: string, code: string) {
  const chat = ctx.chat!;
  const title =
    ("title" in chat && chat.title) ||
    [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ") ||
    (ctx.from?.username ? `@${ctx.from.username}` : String(chat.id));
  const st = await redeemAdminInvite(code, { chat_id: chat.id, title, username: ctx.from?.username || "" });
  if (!st || st.user_id !== ownerId) {
    await ctx.reply("⚠️ Admin havolasi yaroqsiz: allaqachon ishlatilgan yoki muddati o'tgan. Tashkilotchidan yangi havola so'rang.", { reply_markup: removeKb });
    return;
  }
  const admins = await listBotAdmins(st.user_id);
  const lines = [
    "🛠 <b>Admin panelga ulandingiz</b>",
    "",
    `🏫 Tashkilotchi: <b>${esc(st.center_name || "—")}</b>`,
    `👥 Adminlar: ${admins.length}`,
    "",
    "Endi har bir yangi <b>Speaking videosi</b> o'quvchi ma'lumotlari (ism, telefon, markaz, imtihon) bilan shu chatga keladi va bu yerda zaxira sifatida saqlanadi.",
  ];
  if (st.video_retention_days > 0) {
    lines.push("", `📦 Serverdagi videolar Telegram'ga zaxiralangach <b>${st.video_retention_days} kun</b>dan keyin avtomatik o'chiriladi (Telegram nusxasi qoladi).`);
  }
  lines.push("", "<i>Bu havola bir martalik edi — endi u boshqa hech kimga ishlamaydi.</i>");
  await ctx.reply(lines.join("\n"), { parse_mode: "HTML", reply_markup: removeKb });
}

async function handleStart(ctx: Context, s: Session, payload: string) {
  const code = payload.trim();
  if (code.startsWith(ADMIN_PREFIX)) {
    await connectAdmin(ctx, s.owner_id, code.slice(ADMIN_PREFIX.length));
    return;
  }
  // Bot tashkilotchiniki — kirgan har kim shu tashkilotchiga bog'lanadi
  s.user_id = s.owner_id;
  s.step = "idle";
  s.data = {};
  await saveSession(s);
  const st = await organizerFor(s);
  if (st) {
    await sendWelcome(ctx, st);
  } else {
    await ctx.reply("⏸ Ro'yxatdan o'tish hozircha yopiq. Keyinroq urinib ko'ring.", { reply_markup: removeKb });
  }
}

async function handleText(ctx: Context, s: Session, text: string) {
  const t = text.trim();
  if (t === BTN_CANCEL) {
    if (s.step === "idle") {
      await ctx.reply("Boshlash uchun /start ni bosing.", { reply_markup: removeKb });
    } else {
      await cancelFlow(ctx, s);
    }
    return;
  }

  const st = await organizerFor(s);
  if (s.step !== "idle" && !st) {
    // Tashkilotchi o'chirilgan/bloklangan — oqimni tugatamiz
    s.step = "idle";
    s.data = {};
    await saveSession(s);
    await ctx.reply("Ro'yxatdan o'tish vaqtincha to'xtatilgan. /start ni bosib qayta urinib ko'ring.", { reply_markup: removeKb });
    return;
  }

  switch (s.step) {
    case "idle":
      await ctx.reply("Boshlash uchun /start ni bosing.", { reply_markup: removeKb });
      return;

    case "name": {
      const words = t.split(/\s+/).filter(Boolean);
      if (t.length < 3 || t.length > 100 || words.length < 2) {
        await ctx.reply("⚠️ Iltimos, ism va familiyangizni to'liq kiriting (kamida 2 ta so'z).\n<i>Misol: Abdulaziz Karimov</i>", {
          parse_mode: "HTML",
          reply_markup: kbCancel(),
        });
        return;
      }
      s.data.full_name = words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
      s.step = "phone";
      await saveSession(s);
      await askPhone(ctx, st!);
      return;
    }

    case "phone": {
      const phone = normalizePhone(t);
      if (!phone) {
        await ctx.reply("⚠️ Raqam noto'g'ri. O'zbekiston raqamini kiriting yoki tugma orqali ulashing.\n<i>Misol: +998 90 123 45 67</i>", {
          parse_mode: "HTML",
          reply_markup: kbPhone(),
        });
        return;
      }
      s.data.phone = phone;
      s.step = "center";
      await saveSession(s);
      await askCenter(ctx, st!);
      return;
    }

    case "center": {
      const center = t === BTN_SELF_STUDY ? "Mustaqil" : t;
      if (center.length < 2 || center.length > 120) {
        await ctx.reply("⚠️ O'quv markaz nomini kiriting.\n<i>Misol: Younine Academy</i>", { parse_mode: "HTML", reply_markup: kbCenter() });
        return;
      }
      s.data.center_name = center;
      s.step = "teacher";
      await saveSession(s);
      await askTeacher(ctx, st!);
      return;
    }

    case "teacher": {
      const teacher = t === BTN_NO_TEACHER ? "" : t;
      if (teacher.length > 120) {
        await ctx.reply("⚠️ Ustoz ismini qisqaroq kiriting.", { reply_markup: kbTeacher() });
        return;
      }
      s.data.teacher_name = teacher;
      if (st!.free_mode) {
        s.step = "confirm";
        await saveSession(s);
        await ctx.reply("Rahmat! Endi ma'lumotlarni tekshiring 👇", { reply_markup: removeKb });
        await askConfirm(ctx, s, st!);
      } else {
        s.step = "receipt";
        await saveSession(s);
        await askReceipt(ctx, st!);
      }
      return;
    }

    case "receipt":
      await ctx.reply("⚠️ Iltimos, chek <b>rasmini</b> yuboring (foto yoki PDF).", { parse_mode: "HTML", reply_markup: kbCancel() });
      return;

    case "pay_time": {
      const time = t === BTN_PAID_NOW ? formatTashkent(new Date()) : t;
      if (time.length < 4 || time.length > 40) {
        await ctx.reply(`⚠️ To'lov vaqtini kiriting.\n<i>Misol: ${formatTashkent(new Date())}</i>`, { parse_mode: "HTML", reply_markup: kbPayTime() });
        return;
      }
      s.data.payment_time = time;
      s.step = "confirm";
      await saveSession(s);
      await ctx.reply("Rahmat! Endi ma'lumotlarni tekshiring 👇", { reply_markup: removeKb });
      await askConfirm(ctx, s, st!);
      return;
    }

    case "confirm":
      await ctx.reply("Yuqoridagi tugmalar orqali arizani tasdiqlang yoki bekor qiling.");
      return;
  }
}

async function handleContact(ctx: Context, s: Session) {
  const contact = ctx.message?.contact;
  if (!contact) return;
  if (s.step !== "phone") {
    await ctx.reply("Boshlash uchun /start ni bosing.", { reply_markup: removeKb });
    return;
  }
  const phone = normalizePhone(contact.phone_number);
  if (!phone) {
    await ctx.reply("⚠️ Faqat O'zbekiston raqamlari qabul qilinadi. Raqamni qo'lda kiriting.\n<i>Misol: +998 90 123 45 67</i>", {
      parse_mode: "HTML",
      reply_markup: kbPhone(),
    });
    return;
  }
  const st = await organizerFor(s);
  if (!st) return;
  s.data.phone = phone;
  s.step = "center";
  await saveSession(s);
  await askCenter(ctx, st);
}

/** Chek faylini Telegram'dan yuklab, uploads/receipts/<tashkilotchi>/ ga saqlaydi. */
async function downloadReceipt(ctx: Context, s: Session, fileId: string, ext: string): Promise<string> {
  const file = await ctx.api.getFile(fileId);
  if (!file.file_path) throw new Error("Telegram returned no file_path");
  const token = bots.get(s.owner_id)?.token;
  if (!token) throw new Error("bot is not running");
  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Receipt download failed: HTTP ${res.status}`);
  const rel = relPath("receipts", s.owner_id, `${s.chat_id}-${Date.now()}.${ext}`);
  await streamToFile(Readable.fromWeb(res.body as never), rel, MAX_RECEIPT_BYTES);
  return rel;
}

async function handleFile(ctx: Context, s: Session) {
  const msg = ctx.message;
  if (!msg) return;
  if (s.step !== "receipt") {
    if (s.step === "idle") await ctx.reply("Boshlash uchun /start ni bosing.", { reply_markup: removeKb });
    else await ctx.reply("Hozir rasm kerak emas — yuqoridagi savolga javob bering.");
    return;
  }
  const st = await organizerFor(s);
  if (!st) return;

  let fileId = "";
  let ext = "jpg";
  if (msg.photo?.length) {
    fileId = msg.photo[msg.photo.length - 1].file_id; // eng katta o'lcham
  } else if (msg.document) {
    const mime = msg.document.mime_type || "";
    if (mime === "application/pdf") ext = "pdf";
    else if (mime === "image/png") ext = "png";
    else if (mime === "image/jpeg") ext = "jpg";
    else if (mime === "image/webp") ext = "webp";
    else {
      await ctx.reply("⚠️ Faqat rasm (JPG/PNG) yoki PDF qabul qilinadi.", { reply_markup: kbCancel() });
      return;
    }
    fileId = msg.document.file_id;
  }
  if (!fileId) return;

  try {
    s.data.receipt_path = await downloadReceipt(ctx, s, fileId, ext);
  } catch (err) {
    if (err instanceof FileTooLargeError) {
      await ctx.reply("⚠️ Fayl juda katta (20 MB gacha). Skrinshot yuboring.", { reply_markup: kbCancel() });
      return;
    }
    console.error("[bot] receipt download error:", err);
    await ctx.reply("⚠️ Faylni qabul qilib bo'lmadi. Iltimos, qaytadan yuboring.", { reply_markup: kbCancel() });
    return;
  }
  s.data.receipt_sent_at = new Date(msg.date * 1000).toISOString();
  s.step = "pay_time";
  await saveSession(s);
  await ctx.reply("🧾 Chek qabul qilindi ✅");
  await askPayTime(ctx);
}

async function handleCallback(ctx: Context, s: Session, data: string) {
  const [kind, arg] = data.split(":", 2);

  if (kind === "reg" && arg === "my") {
    await ctx.answerCallbackQuery();
    await sendMyRegistrations(ctx, s.owner_id);
    return;
  }

  if (kind === "reg" && arg === "start") {
    await ctx.answerCallbackQuery();
    const tgId = ctx.from?.id;
    if (tgId) {
      const pending = await one<{ seq: number }>(
        "SELECT seq FROM registrations WHERE telegram_id = $1 AND user_id = $2 AND status = 'pending' ORDER BY created DESC LIMIT 1",
        [tgId, s.owner_id],
      );
      if (pending) {
        const kb = new InlineKeyboard().text("➕ Ha, yangi ariza", "reg:force").row().text("📋 Arizalarimni ko'rish", "reg:my");
        await ctx.reply(
          `ℹ️ Sizda allaqachon ko'rib chiqilayotgan ariza bor: <b>${formatSeq(pending.seq)}</b>.\nYana yangi ariza yubormoqchimisiz?`,
          { parse_mode: "HTML", reply_markup: kb },
        );
        return;
      }
    }
    await startRegistration(ctx, s);
    return;
  }

  if (kind === "reg" && arg === "force") {
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    await startRegistration(ctx, s);
    return;
  }

  if (kind === "confirm") {
    if (s.step !== "confirm") {
      await ctx.answerCallbackQuery({ text: "Bu ariza allaqachon yakunlangan" });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
      return;
    }
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);

    if (arg === "cancel") {
      await cancelFlow(ctx, s);
      return;
    }
    if (arg === "edit") {
      const st = await organizerFor(s);
      if (!st) {
        await cancelFlow(ctx, s);
        return;
      }
      s.step = "name";
      s.data = {};
      await saveSession(s);
      await askName(ctx, st);
      return;
    }
    if (arg === "yes") {
      const st = await organizerFor(s);
      const d = s.data;
      if (!st || !d.full_name || !d.phone) {
        await cancelFlow(ctx, s);
        return;
      }
      const reg = await createRegistration({
        user_id: st.user_id,
        telegram_id: ctx.from!.id,
        telegram_username: ctx.from?.username || "",
        full_name: d.full_name,
        phone: d.phone,
        center_name: d.center_name || "",
        teacher_name: d.teacher_name || "",
        amount: st.free_mode ? 0 : st.exam_price,
        receipt_path: d.receipt_path || null,
        receipt_sent_at: d.receipt_sent_at ? new Date(d.receipt_sent_at) : null,
        payment_time: d.payment_time || "",
      });
      s.step = "idle";
      s.data = {};
      await saveSession(s);

      const lines = [
        "🎉 <b>Tabriklaymiz! Arizangiz qabul qilindi.</b>",
        "",
        `🆔 Ariza raqami: <b>${formatSeq(reg.seq)}</b>`,
        "⏳ Holat: Ko'rib chiqilmoqda",
        "",
        "To'lovingiz tekshirilgach, natija shu yerda xabar qilinadi.",
      ];
      if (st.contact_info) lines.push(`📞 Savollar uchun: ${esc(st.contact_info)}`);
      await ctx.reply(lines.join("\n"), { parse_mode: "HTML", reply_markup: removeKb });
    }
  }
}

// ------------------------------------------------------------------ tashqi API (web paneldan)

/** Tashkilotchi arizani tasdiqlaganda/rad etganda talabaga xabar yuboradi. Xato bo'lsa faqat logga yozadi. */
export async function notifyRegistrationStatus(reg: RegistrationRow, st: SettingsRow | null): Promise<void> {
  const inst = bots.get(reg.user_id);
  if (!inst) return;
  let text: string;
  if (reg.status === "approved") {
    const lines = [
      `✅ <b>Ariza ${formatSeq(reg.seq)} tasdiqlandi!</b>`,
      "",
      "Siz CEFR Speaking mock imtihoniga muvaffaqiyatli ro'yxatdan o'tdingiz 🎓",
    ];
    if (st?.exam_info) lines.push("", `📅 ${esc(st.exam_info)}`);
    if (reg.note) lines.push("", `💬 ${esc(reg.note)}`);
    if (st?.contact_info) lines.push("", `📞 Savollar uchun: ${esc(st.contact_info)}`);
    text = lines.join("\n");
  } else if (reg.status === "rejected") {
    const lines = [`❌ <b>Ariza ${formatSeq(reg.seq)} rad etildi.</b>`];
    if (reg.note) lines.push("", `Sabab: ${esc(reg.note)}`);
    lines.push("", "Qayta ro'yxatdan o'tish uchun /start ni bosing.");
    if (st?.contact_info) lines.push(`📞 Savollar uchun: ${esc(st.contact_info)}`);
    text = lines.join("\n");
  } else {
    return;
  }
  try {
    await inst.bot.api.sendMessage(Number(reg.telegram_id), text, { parse_mode: "HTML" });
  } catch (err) {
    console.error(`[bot] notify ${reg.id} failed:`, err instanceof Error ? err.message : err);
  }
}

// ------------------------------------------------------------------ video zaxira (admin panel)

export interface RecordingForBackup {
  id: string;
  local_id: string;
  user_id: string;
  timestamp: Date;
  duration: number;
  student_id: string;
  student_name: string;
  student_phone: string;
  video_path: string | null;
  size_bytes: number;
  registration_id: string | null;
  attempt?: number | null;
  integrity?: unknown;
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/**
 * Yuklangan Speaking videosini tashkilotchining admin chatiga yuboradi (zaxira).
 * 50 MB gacha — fayl sifatida; kattaroq bo'lsa — faqat havola (va video serverdan avtomatik o'chirilmaydi).
 * Xatolar tashlanmaydi — tg_backup_error ga yoziladi.
 */
export async function backupRecordingToTelegram(rec: RecordingForBackup): Promise<void> {
  const inst = bots.get(rec.user_id);
  if (!inst) return;
  const bot = inst.bot;
  const st = await findSettingsByUser(rec.user_id);
  if (!st) return;
  const admins = await listBotAdmins(rec.user_id);
  if (!admins.length) return;

  const reg = rec.registration_id
    ? await one<{ seq: number; full_name: string; phone: string; center_name: string; teacher_name: string; attempts: number; attempt_limit: number }>(
        "SELECT seq, full_name, phone, center_name, teacher_name, attempts, attempt_limit FROM registrations WHERE id = $1",
        [rec.registration_id],
      )
    : null;
  const org = await one<{ first_name: string; last_name: string; username: string }>(
    "SELECT first_name, last_name, username FROM users WHERE id = $1",
    [rec.user_id],
  );
  const orgName = [org?.first_name, org?.last_name].filter(Boolean).join(" ") || org?.username || "";
  const studentName = reg?.full_name || rec.student_name || "—";
  const link = rec.video_path ? `${config.publicBaseUrl}${publicUrl(rec.video_path)}` : "";

  const lines = [
    "🎥 <b>Speaking — Mock imtihon</b>",
    "",
    `👤 O'quvchi: <b>${reg ? formatSeq(reg.seq) + " " : ""}${esc(studentName)}</b>`,
    `📱 Telefon: ${esc(reg?.phone || rec.student_phone || "—")}`,
    `🏫 O'quv markaz: ${esc(reg?.center_name || "—")}`,
    ...(reg?.teacher_name ? [`👨‍🏫 Ustozi: ${esc(reg.teacher_name)}`] : []),
    `🎓 Tashkilotchi: ${esc(st.center_name || orgName)}${orgName && st.center_name && orgName !== st.center_name ? ` (${esc(orgName)})` : ""}`,
  ];
  if (!reg && rec.student_id) lines.push(`🆔 ID: ${esc(rec.student_id)}`);
  if (reg) {
    const n = rec.attempt ?? Number(reg.attempts);
    const lim = Number(reg.attempt_limit);
    lines.push(n > 1 ? `🔁 Urinish: <b>${n}/${lim}</b> — QAYTA topshirish` : `🎯 Urinish: <b>${n}/${lim}</b>`);
    if (n >= lim) lines.push("⛔️ Bu o'quvchining urinish limiti tugadi");
  }
  if (st.exam_info) lines.push(`📅 Imtihon: ${esc(st.exam_info)}`);
  lines.push(`🕐 Topshirilgan: ${formatTashkent(new Date(rec.timestamp))}`, `⏱ Davomiyligi: ${fmtDuration(Number(rec.duration))}`);
  if (rec.size_bytes) lines.push(`💾 Hajmi: ${fmtBytes(Number(rec.size_bytes))}`);
  // Halollik nazorati xulosasi (hodisa bo'lmasa — toza)
  const integrity = integritySummaryHtml(Array.isArray(rec.integrity) ? rec.integrity : []);
  lines.push(integrity ?? "🛡 Nazorat: buzilish yo'q ✅");
  if (link) lines.push("", `🔗 <a href="${link}">Serverdan ochish</a>`);

  const caption = lines.join("\n");
  const chatIds = admins.map((a) => Number(a.chat_id));

  try {
    let fileId = "";
    if (rec.video_path) {
      const abs = absPath(rec.video_path);
      const stat = await fsp.stat(abs).catch(() => null);
      if (stat && stat.size <= TG_MAX_UPLOAD_BYTES) {
        const ext = rec.video_path.split(".").pop() || "webm";
        const safeName = studentName.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "") || "speaking";
        const fileName = `${safeName}_${formatTashkent(new Date(rec.timestamp)).replace(/[.: ]/g, "-")}.${ext}`;
        // Birinchi adminga faylni yuklaymiz, qolganlariga file_id orqali (qayta yuklamasdan)
        const sent = await bot.api.sendDocument(chatIds[0], new InputFile(abs, fileName), { caption, parse_mode: "HTML" });
        fileId = sent.document?.file_id || "";
        await query("UPDATE recordings SET tg_backup_at = now(), tg_backup_error = '', tg_file_id = $2 WHERE id = $1", [rec.id, fileId]);
        for (const cid of chatIds.slice(1)) {
          try {
            await bot.api.sendDocument(cid, fileId || new InputFile(abs, fileName), { caption, parse_mode: "HTML" });
          } catch (e) {
            console.error(`[bot] backup → admin ${cid} failed:`, e instanceof Error ? e.message : e);
          }
        }
      }
    }
    if (!fileId) {
      const text = caption + "\n\n⚠️ <i>Video 50 MB dan katta — Telegram'ga fayl sifatida yuborib bo'lmadi. Serverda saqlanib qoladi (avtomatik o'chirilmaydi).</i>";
      for (const cid of chatIds) {
        try {
          await bot.api.sendMessage(cid, text, { parse_mode: "HTML" });
        } catch (e) {
          console.error(`[bot] backup → admin ${cid} failed:`, e instanceof Error ? e.message : e);
        }
      }
      await query("UPDATE recordings SET tg_backup_error = 'too_large' WHERE id = $1", [rec.id]);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[bot] backup ${rec.local_id} failed:`, msg);
    await query("UPDATE recordings SET tg_backup_error = $2 WHERE id = $1", [rec.id, msg.slice(0, 300)]).catch(() => undefined);
  }
}

// ------------------------------------------------------------------ natijalarni e'lon qilish

function fmtScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** O'quvchiga yuboriladigan natija matni (HTML). */
function resultsText(r: RegistrationWithSpeaking, st: SettingsRow): string {
  const counted = countedSkills(r);
  const lines = [
    "🎓 <b>CEFR Mock imtihon natijalari</b>",
    "",
    `🏫 ${esc(st.center_name || "O'quv markaz")}`,
    `👤 ${esc(r.full_name)} · ${formatSeq(r.seq)}`,
  ];
  if (st.exam_info) lines.push(`📅 ${esc(st.exam_info)}`);
  lines.push("");
  for (const k of SKILLS) {
    if (skillSkipped(r, k)) {
      lines.push(`${SKILL_EMOJI[k]} ${SKILL_LABEL[k]}: — <i>(topshirilmagan)</i>`);
    } else {
      const sc = skillScore(r, k);
      lines.push(`${SKILL_EMOJI[k]} ${SKILL_LABEL[k]}: <b>${sc === null ? "—" : fmtScore(sc)}</b>`);
    }
  }
  const overall = overallScore(r);
  lines.push("", `📊 <b>Overall: ${overall === null ? "—" : overall}</b>`);
  if (counted.length < SKILLS.length) {
    const skipped = SKILLS.filter((k) => skillSkipped(r, k)).map((k) => SKILL_LABEL[k]).join(", ");
    lines.push(`<i>${counted.length} ta ko'nikma o'rtachasi — ${skipped} topshirilmagani uchun hisobga olinmadi.</i>`);
  }
  if (r.sp_local_id) lines.push("", "📹 Speaking videongiz biriktirilgan.");
  if (st.contact_info) lines.push("", `📞 Savollar uchun: ${esc(st.contact_info)}`);
  return lines.join("\n");
}

/** Bitta o'quvchiga natijasini (va Speaking videosini) yuboradi; muvaffaqiyatda results_published_at belgilanadi. */
async function sendResultsToStudent(r: RegistrationWithSpeaking, st: SettingsRow): Promise<void> {
  const inst = bots.get(r.user_id);
  if (!inst) throw new Error("bot is not running");
  const bot = inst.bot;
  const chatId = Number(r.telegram_id);
  const text = resultsText(r, st);

  const rec = r.sp_local_id
    ? await one<{ tg_file_id: string; video_path: string | null }>(
        "SELECT tg_file_id, video_path FROM recordings WHERE registration_id = $1 ORDER BY \"timestamp\" DESC LIMIT 1",
        [r.id],
      )
    : null;

  const safeName = r.full_name.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "") || "student";
  const videoLink = rec?.video_path ? `${config.publicBaseUrl}${publicUrl(rec.video_path)}` : "";

  // 1) Natija varaqasi (PDF) — asosiy xabar; tayyorlab bo'lmasa matnning o'zi ketadi
  let sent = false;
  const pdf = await buildResultPdf({ reg: r, settings: st, videoUrl: videoLink || undefined }).catch((e) => {
    console.error(`[publish] PDF ${formatSeq(r.seq)}:`, e instanceof Error ? e.message : e);
    return null;
  });
  if (pdf) {
    await bot.api.sendDocument(chatId, new InputFile(pdf, `${safeName}_natija.pdf`), { caption: text, parse_mode: "HTML" });
    sent = true;
  }

  // 2) Speaking video (bo'lsa)
  const videoCaption = sent ? `📹 <b>Speaking video</b> — ${esc(r.full_name)}` : text;
  if (rec?.tg_file_id) {
    // Telegram'da allaqachon bor — file_id orqali qayta yuklamasdan
    await bot.api.sendDocument(chatId, rec.tg_file_id, { caption: videoCaption, parse_mode: "HTML" });
    sent = true;
  } else if (rec?.video_path) {
    const abs = absPath(rec.video_path);
    const stat = await fsp.stat(abs).catch(() => null);
    if (stat && stat.size <= TG_MAX_UPLOAD_BYTES) {
      const ext = rec.video_path.split(".").pop() || "webm";
      const res = await bot.api.sendDocument(chatId, new InputFile(abs, `${safeName}_speaking.${ext}`), { caption: videoCaption, parse_mode: "HTML" });
      const fileId = res.document?.file_id || "";
      if (fileId) await query("UPDATE recordings SET tg_file_id = $2 WHERE registration_id = $1 AND video_path = $3", [r.id, fileId, rec.video_path]);
      sent = true;
    } else if (stat) {
      await bot.api.sendMessage(chatId, `${sent ? "📹 Speaking video" : text}\n\n🔗 <a href="${videoLink}">Speaking videoni ochish</a>`, { parse_mode: "HTML" });
      sent = true;
    }
  }
  if (!sent) await bot.api.sendMessage(chatId, text, { parse_mode: "HTML" });

  await query("UPDATE registrations SET results_published_at = now(), results_publish_error = '' WHERE id = $1", [r.id]);
}

const publishing = new Set<string>();

export function isPublishing(userId: string): boolean {
  return publishing.has(userId);
}

/**
 * Tashkilotchining natijalarini e'lon qiladi: to'liq belgilangan (yoki ids bilan tanlangan) tasdiqlangan
 * o'quvchilarga fonda birma-bir yuboradi. Qaytadi: navbatga qo'yilganlar soni.
 */
export async function publishResults(userId: string, ids: string[] | null): Promise<number> {
  const st = await findSettingsByUser(userId);
  if (!st) return 0;
  const params: unknown[] = [userId];
  let where = "r.user_id = $1 AND r.status = 'approved' AND r.archived_at IS NULL";
  if (ids) {
    params.push(ids);
    where += " AND r.id = ANY($2::uuid[])";
  } else {
    where += " AND r.results_published_at IS NULL";
  }
  const rows = await query<RegistrationWithSpeaking>(`${REG_WITH_SPEAKING_SELECT} WHERE ${where} ORDER BY r.seq`, params);
  const ready = rows.filter((r) => missingSkills(r).length === 0 && countedSkills(r).length > 0);
  if (!ready.length) return 0;

  publishing.add(userId);
  void (async () => {
    try {
      for (const r of ready) {
        try {
          await sendResultsToStudent(r, st);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[publish] ${formatSeq(r.seq)} ${r.full_name}:`, msg);
          await query("UPDATE registrations SET results_publish_error = $2 WHERE id = $1", [r.id, msg.slice(0, 300)]).catch(() => undefined);
        }
        await new Promise((res) => setTimeout(res, 1200)); // Telegram limitlari (~1 xabar/soniya)
      }
      console.log(`[publish] ${ready.length} ta natija yuborildi (user ${userId})`);
    } finally {
      publishing.delete(userId);
    }
  })();
  return ready.length;
}

/**
 * Telegram'ga zaxiralangan va saqlash muddati o'tgan videolarni serverdan o'chiradi
 * (yozuv qoladi: video_deleted_at belgilanadi, Telegram nusxasi bor). Qaytadi: o'chirilganlar soni.
 */
export async function cleanupBackedUpVideos(): Promise<number> {
  const rows = await query<{ id: string; user_id: string; video_path: string }>(
    `SELECT rec.id, rec.user_id, rec.video_path
     FROM recordings rec
     JOIN registration_settings st ON st.user_id = rec.user_id
     WHERE rec.video_path IS NOT NULL AND rec.tg_backup_at IS NOT NULL AND st.video_retention_days > 0
       AND rec.created < now() - make_interval(days => st.video_retention_days)
     LIMIT 100`,
  );
  const users = new Set<string>();
  for (const r of rows) {
    await fsp.rm(absPath(r.video_path), { force: true }).catch(() => undefined);
    await query("UPDATE recordings SET video_path = NULL, size_bytes = 0, video_deleted_at = now() WHERE id = $1", [r.id]);
    users.add(r.user_id);
  }
  for (const uid of users) {
    await query(
      "UPDATE users SET storage_used_bytes = (SELECT COALESCE(SUM(size_bytes), 0) FROM recordings WHERE user_id = $1) WHERE id = $1",
      [uid],
    );
  }
  if (rows.length) console.log(`[cleanup] ${rows.length} ta zaxiralangan video serverdan o'chirildi`);
  return rows.length;
}

let cleanupTimer: NodeJS.Timeout | null = null;

/** Har 6 soatda (va ishga tushgandan 1 daqiqa o'tib) eski videolarni tozalaydi. */
export function startVideoCleanupJob(): void {
  const run = () => cleanupBackedUpVideos().catch((err) => console.error("[cleanup] xato:", err));
  setTimeout(run, 60_000).unref();
  cleanupTimer = setInterval(run, 6 * 60 * 60 * 1000);
  cleanupTimer.unref();
}

// ------------------------------------------------------------------ ishga tushirish (ko'p bot)

function registerHandlers(b: Bot, ownerId: string) {
  b.command("start", async (ctx) => {
    const s = await loadSession(ownerId, ctx.chat.id);
    await handleStart(ctx, s, ctx.match || "");
  });
  b.command("cancel", async (ctx) => {
    const s = await loadSession(ownerId, ctx.chat.id);
    if (s.step === "idle") await ctx.reply("Faol ariza yo'q. Boshlash uchun /start ni bosing.", { reply_markup: removeKb });
    else await cancelFlow(ctx, s);
  });
  b.command("my", async (ctx) => sendMyRegistrations(ctx, ownerId));
  b.command("help", async (ctx) =>
    ctx.reply(
      "📝 /start — ro'yxatdan o'tish\n📋 /my — mening arizalarim\n❌ /cancel — joriy arizani bekor qilish",
      { reply_markup: removeKb },
    ),
  );

  b.on("callback_query:data", async (ctx) => {
    const chatId = ctx.chat?.id ?? ctx.from.id;
    const s = await loadSession(ownerId, chatId);
    await handleCallback(ctx, s, ctx.callbackQuery.data);
  });
  b.on("message:contact", async (ctx) => handleContact(ctx, await loadSession(ownerId, ctx.chat.id)));
  b.on(["message:photo", "message:document"], async (ctx) => handleFile(ctx, await loadSession(ownerId, ctx.chat.id)));
  b.on("message:text", async (ctx) => handleText(ctx, await loadSession(ownerId, ctx.chat.id), ctx.message.text));
  b.on("message", async (ctx) => {
    const s = await loadSession(ownerId, ctx.chat.id);
    if (s.step === "receipt") await ctx.reply("⚠️ Iltimos, chek rasmini (foto yoki PDF) yuboring.", { reply_markup: kbCancel() });
  });

  b.catch((err) => {
    const e = err.error;
    const tag = `[bot:${bots.get(ownerId)?.username || ownerId.slice(0, 8)}]`;
    if (e instanceof GrammyError) console.error(tag, "Telegram API error:", e.description);
    else if (e instanceof HttpError) console.error(tag, "network error:", e.message);
    else console.error(tag, "handler error:", e);
  });
}

/** Tokenni tekshiradi (getMe) — yaroqli bo'lsa bot username'ini qaytaradi. */
export async function validateBotToken(token: string): Promise<{ id: number; username: string }> {
  const me = await new Bot(token).api.getMe();
  return { id: me.id, username: me.username };
}

/**
 * Tashkilotchi botini ishga tushiradi (oldingisi bo'lsa to'xtatib). Qaytadi: bot username.
 * Xato tashlaydi — token yaroqsiz yoki Telegram'ga ulanib bo'lmasa.
 */
export async function startBotFor(ownerId: string, token: string): Promise<string> {
  await stopBotFor(ownerId);
  const b = new Bot(token);
  registerHandlers(b, ownerId);
  const me = await b.api.getMe();
  await b.api
    .setMyCommands([
      { command: "start", description: "Ro'yxatdan o'tish" },
      { command: "my", description: "Mening arizalarim" },
      { command: "cancel", description: "Arizani bekor qilish" },
      { command: "help", description: "Yordam" },
    ])
    .catch(() => undefined);
  bots.set(ownerId, { bot: b, token, username: me.username, ownerId });
  // Long polling — kutmaymiz (server bilan parallel ishlaydi); to'xtaguncha qaytmaydi
  void b
    .start({
      drop_pending_updates: false,
      onStart: () => console.log(`[bot] @${me.username} ishga tushdi (tashkilotchi ${ownerId.slice(0, 8)})`),
    })
    .catch((err) => console.error(`[bot] @${me.username} to'xtadi:`, err instanceof Error ? err.message : err));
  return me.username;
}

export async function stopBotFor(ownerId: string): Promise<void> {
  const inst = bots.get(ownerId);
  if (!inst) return;
  bots.delete(ownerId);
  await inst.bot.stop().catch(() => undefined);
}

/** Barcha tashkilotchi botlarini ishga tushiradi (xatolar logga, server ishlayveradi). */
export async function startAllBots(): Promise<void> {
  const rows = await query<{ user_id: string; bot_token: string }>(
    "SELECT user_id, bot_token FROM registration_settings WHERE bot_token IS NOT NULL AND bot_token <> ''",
  );
  if (!rows.length) {
    console.log("[bot] hech qanday bot sozlanmagan");
    return;
  }
  for (const r of rows) {
    try {
      await startBotFor(r.user_id, r.bot_token);
    } catch (err) {
      console.error(`[bot] ${r.user_id.slice(0, 8)} boti ishga tushmadi:`, err instanceof Error ? err.message : err);
    }
  }
}

export async function stopAllBots(): Promise<void> {
  await Promise.all([...bots.keys()].map((id) => stopBotFor(id)));
}

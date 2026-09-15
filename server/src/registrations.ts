import { randomBytes } from "node:crypto";
import { one, query, withTransaction, type Queryable } from "./db.js";
import { publicUrl } from "./storage.js";

export type RegistrationStatus = "pending" | "approved" | "rejected";

export interface SettingsRow {
  user_id: string;
  reg_code: string;
  enabled: boolean;
  free_mode: boolean;
  center_name: string;
  exam_price: number;
  card_number: string;
  card_holder: string;
  exam_info: string;
  contact_info: string;
  receipt_minutes: number;
  admin_code: string | null;
  admin_chat_id: number | null;
  admin_chat_title: string;
  video_retention_days: number;
  ticket_footer: string;
  ticket_qr_url: string;
  station_password_hash: string | null;
  station_enabled: boolean;
  bot_token: string | null;
  bot_username: string;
  /** Botdagi o'quv markaz tugmalari (bo'sh massiv — kodda turgan standart ro'yxat) */
  centers: unknown;
  /** Markaz -> ustozlar ro'yxati (bo'sh — kodda turgan standart ro'yxat) */
  teachers: unknown;
  created: Date;
  updated: Date;
}

export interface RegistrationRow {
  id: string;
  user_id: string;
  seq: number;
  telegram_id: number;
  telegram_username: string;
  full_name: string;
  phone: string;
  center_name: string;
  teacher_name: string;
  amount: number;
  receipt_path: string | null;
  receipt_sent_at: Date | null;
  payment_time: string;
  status: RegistrationStatus;
  note: string;
  reviewed_at: Date | null;
  score_listening: number | null;
  score_reading: number | null;
  score_writing: number | null;
  score_speaking: number | null;
  skip_listening: boolean;
  skip_reading: boolean;
  skip_writing: boolean;
  skip_speaking: boolean;
  results_published_at: Date | null;
  results_publish_error: string;
  archived_at: Date | null;
  attempts: number;
  attempt_limit: number;
  created: Date;
  updated: Date;
}

export const SKILLS = ["listening", "reading", "writing", "speaking"] as const;
export type Skill = (typeof SKILLS)[number];
export const SKILL_LABEL: Record<Skill, string> = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" };
export const SKILL_EMOJI: Record<Skill, string> = { listening: "🎧", reading: "📖", writing: "✍️", speaking: "🗣" };

/** Ro'yxat sahifasi uchun: arizaga bog'langan oxirgi Speaking yozuvi (LEFT JOIN LATERAL) */
export interface RegistrationWithSpeaking extends RegistrationRow {
  sp_local_id: string | null;
  sp_video_path: string | null;
  sp_timestamp: Date | null;
  sp_duration: number | null;
  sp_tg_backup_at: Date | null;
  sp_video_deleted_at: Date | null;
}

export const SETTINGS_COLS = `user_id, reg_code, enabled, free_mode, center_name, exam_price, card_number, card_holder,
  exam_info, contact_info, receipt_minutes, admin_code, admin_chat_id, admin_chat_title, video_retention_days,
  ticket_footer, ticket_qr_url, station_password_hash, station_enabled, bot_token, bot_username, centers, teachers, created, updated`;

export const REG_COLS = `id, user_id, seq, telegram_id, telegram_username, full_name, phone, center_name, teacher_name, amount,
  receipt_path, receipt_sent_at, payment_time, status, note, reviewed_at,
  score_listening, score_reading, score_writing, score_speaking,
  skip_listening, skip_reading, skip_writing, skip_speaking,
  results_published_at, results_publish_error, archived_at, attempts, attempt_limit, created, updated`;

/** registrations r + oxirgi speaking yozuvi (sp_*) — FROM qismi bilan birga ishlatiladi */
export const REG_WITH_SPEAKING_SELECT = `
  SELECT ${REG_COLS.split(",").map((c) => "r." + c.trim()).join(", ")},
         sp.local_id AS sp_local_id, sp.video_path AS sp_video_path, sp."timestamp" AS sp_timestamp,
         sp.duration AS sp_duration, sp.tg_backup_at AS sp_tg_backup_at, sp.video_deleted_at AS sp_video_deleted_at
  FROM registrations r
  LEFT JOIN LATERAL (
    SELECT local_id, video_path, "timestamp", duration, tg_backup_at, video_deleted_at
    FROM recordings WHERE registration_id = r.id ORDER BY "timestamp" DESC LIMIT 1
  ) sp ON TRUE`;

export async function getRegistrationWithSpeaking(id: string, userId: string): Promise<RegistrationWithSpeaking | null> {
  return one<RegistrationWithSpeaking>(`${REG_WITH_SPEAKING_SELECT} WHERE r.id = $1 AND r.user_id = $2`, [id, userId]);
}

/** Deep-link kodi: 8 ta katta harf/raqam, o'xshash belgilarsiz (0/O, 1/I). */
function newRegCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/** Admin panel kodi: 16 belgi (talaba havolasidan uzunroq va alohida — taxmin qilib bo'lmaydi). */
function newAdminCode(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/** Eski qatorlarda admin_code bo'lmasa — yaratib beradi. */
async function ensureAdminCode(st: SettingsRow): Promise<SettingsRow> {
  if (st.admin_code) return st;
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await one<SettingsRow>(
      `UPDATE registration_settings SET admin_code = $2 WHERE user_id = $1 AND admin_code IS NULL RETURNING ${SETTINGS_COLS}`,
      [st.user_id, newAdminCode()],
    ).catch((err: { code?: string }) => {
      if (err.code === "23505") return null;
      throw err;
    });
    if (row) return row;
    const again = await one<SettingsRow>(`SELECT ${SETTINGS_COLS} FROM registration_settings WHERE user_id = $1`, [st.user_id]);
    if (again?.admin_code) return again;
  }
  return st;
}

/** Tashkilotchi sozlamalari; yo'q bo'lsa — markaz nomi profil ismidan olinib yaratiladi. */
export async function getOrCreateSettings(userId: string): Promise<SettingsRow> {
  const existing = await one<SettingsRow>(`SELECT ${SETTINGS_COLS} FROM registration_settings WHERE user_id = $1`, [userId]);
  if (existing) return ensureAdminCode(existing);

  const u = await one<{ first_name: string; last_name: string; username: string }>(
    "SELECT first_name, last_name, username FROM users WHERE id = $1",
    [userId],
  );
  const centerName = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim() || u?.username || "";

  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await one<SettingsRow>(
      `INSERT INTO registration_settings (user_id, reg_code, center_name, admin_code)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING ${SETTINGS_COLS}`,
      [userId, newRegCode(), centerName, newAdminCode()],
    ).catch((err: { code?: string }) => {
      if (err.code === "23505") return null; // reg_code to'qnashuvi — qayta urinamiz
      throw err;
    });
    if (row) return row;
    const again = await one<SettingsRow>(`SELECT ${SETTINGS_COLS} FROM registration_settings WHERE user_id = $1`, [userId]);
    if (again) return again;
  }
  throw new Error("Could not create registration settings");
}

export async function findSettingsByCode(code: string): Promise<SettingsRow | null> {
  return one<SettingsRow>(`SELECT ${SETTINGS_COLS} FROM registration_settings WHERE reg_code = $1`, [code.trim().toUpperCase()]);
}

export async function findSettingsByUser(userId: string): Promise<SettingsRow | null> {
  return one<SettingsRow>(`SELECT ${SETTINGS_COLS} FROM registration_settings WHERE user_id = $1`, [userId]);
}

// ---------------------------------------------------------------- admin bot paneli

export interface BotAdminRow {
  id: string;
  user_id: string;
  chat_id: number;
  title: string;
  username: string;
  added_at: Date;
}

export interface AdminInviteRow {
  code: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
  used_chat_id: number | null;
}

export const ADMIN_INVITE_TTL_HOURS = 24;

export async function listBotAdmins(userId: string): Promise<BotAdminRow[]> {
  return query<BotAdminRow>("SELECT id, user_id, chat_id, title, username, added_at FROM bot_admins WHERE user_id = $1 ORDER BY added_at", [userId]);
}

/** Hozir amal qilayotgan (ishlatilmagan, muddati o'tmagan) taklif — bo'lsa. */
export async function activeAdminInvite(userId: string): Promise<AdminInviteRow | null> {
  return one<AdminInviteRow>(
    "SELECT code, user_id, created_at, expires_at, used_at, used_chat_id FROM admin_invites WHERE user_id = $1 AND used_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
}

/** Yangi bir martalik taklif yaratadi; oldingi ishlatilmagan takliflar bekor qilinadi. */
export async function createAdminInvite(userId: string): Promise<AdminInviteRow> {
  await query("UPDATE admin_invites SET expires_at = now() WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()", [userId]);
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await one<AdminInviteRow>(
      `INSERT INTO admin_invites (code, user_id, expires_at) VALUES ($1, $2, now() + make_interval(hours => $3))
       ON CONFLICT (code) DO NOTHING
       RETURNING code, user_id, created_at, expires_at, used_at, used_chat_id`,
      [newAdminCode(), userId, ADMIN_INVITE_TTL_HOURS],
    );
    if (row) return row;
  }
  throw new Error("Could not create admin invite");
}

export async function revokeAdminInvites(userId: string): Promise<void> {
  await query("UPDATE admin_invites SET expires_at = now() WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()", [userId]);
}

/**
 * Taklif kodini ishlatadi (bir martalik): chatni adminlar ro'yxatiga qo'shadi.
 * Qaytadi: tashkilotchi sozlamalari yoki null (kod yaroqsiz).
 */
export async function redeemAdminInvite(code: string, chat: { chat_id: number; title: string; username: string }): Promise<SettingsRow | null> {
  return withTransaction(async (client) => {
    const inv = await one<AdminInviteRow>(
      "SELECT code, user_id, created_at, expires_at, used_at, used_chat_id FROM admin_invites WHERE code = $1 AND used_at IS NULL AND expires_at > now() FOR UPDATE",
      [code.trim()],
      client,
    );
    if (!inv) return null;
    await query("UPDATE admin_invites SET used_at = now(), used_chat_id = $2 WHERE code = $1", [inv.code, chat.chat_id], client);
    await query(
      `INSERT INTO bot_admins (user_id, chat_id, title, username) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, chat_id) DO UPDATE SET title = EXCLUDED.title, username = EXCLUDED.username`,
      [inv.user_id, chat.chat_id, chat.title, chat.username],
      client,
    );
    return one<SettingsRow>(`SELECT ${SETTINGS_COLS} FROM registration_settings WHERE user_id = $1`, [inv.user_id], client);
  });
}

export async function removeBotAdmin(userId: string, id: string): Promise<boolean> {
  const row = await one<{ id: string }>("DELETE FROM bot_admins WHERE user_id = $1 AND id = $2 RETURNING id", [userId, id]);
  return !!row;
}

/**
 * Mock test oldidan qidiruv: tasdiqlangan o'quvchilar, ism/familiyaning istalgan so'zi q bilan boshlansa.
 * "da" → "Davron Karimov", "Aziz Dadaxonov". Telefon raqam oxiri bo'yicha ham.
 */
export async function searchApprovedStudents(userId: string, q: string, limit = 10) {
  const term = q.trim();
  const rows = await query<RegistrationWithSpeaking>(
    `${REG_WITH_SPEAKING_SELECT}
     WHERE r.user_id = $1 AND r.status = 'approved' AND r.archived_at IS NULL
       AND (r.full_name ILIKE $2 OR r.full_name ILIKE $3 OR r.phone LIKE $4)
     ORDER BY r.full_name ASC LIMIT $5`,
    [userId, `${term}%`, `% ${term}%`, `%${term.replace(/\D/g, "") || "#"}%`, limit],
  );
  return rows.map(registrationToClient);
}

/** Botda tanlash uchun: ro'yxatdan o'tish yoqilgan tashkilotchilar. */
export async function listEnabledOrganizers(): Promise<Pick<SettingsRow, "user_id" | "center_name" | "reg_code">[]> {
  return query(
    `SELECT s.user_id, s.center_name, s.reg_code
     FROM registration_settings s JOIN users u ON u.id = s.user_id
     WHERE s.enabled AND NOT u.blocked AND s.center_name <> ''
     ORDER BY s.center_name`,
  );
}

export interface NewRegistration {
  user_id: string;
  telegram_id: number;
  telegram_username: string;
  full_name: string;
  phone: string;
  center_name: string;
  teacher_name: string;
  amount: number;
  receipt_path: string | null;
  receipt_sent_at: Date | null;
  payment_time: string;
}

/** Ariza yaratadi; seq tashkilotchi bo'yicha ketma-ket (parallel yozuvlar uchun sozlamalar qatori qulflanadi). */
export async function createRegistration(data: NewRegistration): Promise<RegistrationRow> {
  return withTransaction(async (client) => {
    await client.query("SELECT 1 FROM registration_settings WHERE user_id = $1 FOR UPDATE", [data.user_id]);
    const next = await one<{ seq: number }>(
      "SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM registrations WHERE user_id = $1",
      [data.user_id],
      client,
    );
    const row = await one<RegistrationRow>(
      `INSERT INTO registrations (user_id, seq, telegram_id, telegram_username, full_name, phone, center_name, teacher_name, amount,
         receipt_path, receipt_sent_at, payment_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $12, $8, $9, $10, $11)
       RETURNING ${REG_COLS}`,
      [
        data.user_id,
        Number(next?.seq ?? 1),
        data.telegram_id,
        data.telegram_username,
        data.full_name,
        data.phone,
        data.center_name,
        data.amount,
        data.receipt_path,
        data.receipt_sent_at,
        data.payment_time,
        data.teacher_name,
      ],
      client,
    );
    return row!;
  });
}

export async function listRegistrationsByTelegram(telegramId: number, limit = 10): Promise<RegistrationRow[]> {
  return query<RegistrationRow>(
    `SELECT ${REG_COLS} FROM registrations WHERE telegram_id = $1 ORDER BY created DESC LIMIT $2`,
    [telegramId, limit],
  );
}

export async function getRegistration(id: string, userId: string, client?: Queryable): Promise<RegistrationRow | null> {
  return one<RegistrationRow>(`SELECT ${REG_COLS} FROM registrations WHERE id = $1 AND user_id = $2`, [id, userId], client);
}

/** Mijozga (web) qaytariladigan ko'rinish. */
export function registrationToClient(r: RegistrationRow) {
  return {
    id: r.id,
    user_id: r.user_id,
    seq: Number(r.seq),
    telegram_id: Number(r.telegram_id),
    telegram_username: r.telegram_username,
    full_name: r.full_name,
    phone: r.phone,
    center_name: r.center_name,
    teacher_name: r.teacher_name,
    amount: Number(r.amount),
    receipt_url: r.receipt_path ? publicUrl(r.receipt_path) : "",
    receipt_sent_at: r.receipt_sent_at,
    payment_time: r.payment_time,
    status: r.status,
    note: r.note,
    reviewed_at: r.reviewed_at,
    scores: {
      listening: numOrNull(r.score_listening),
      reading: numOrNull(r.score_reading),
      writing: numOrNull(r.score_writing),
      speaking: numOrNull(r.score_speaking),
    },
    skipped: {
      listening: !!r.skip_listening,
      reading: !!r.skip_reading,
      writing: !!r.skip_writing,
      speaking: !!r.skip_speaking,
    },
    overall: overallScore(r),
    missing_skills: missingSkills(r),
    results_complete: missingSkills(r).length === 0 && countedSkills(r).length > 0,
    results_published_at: r.results_published_at,
    results_publish_error: r.results_publish_error,
    archived_at: r.archived_at,
    attempts: Number(r.attempts),
    attempt_limit: Number(r.attempt_limit),
    attempts_left: Math.max(0, Number(r.attempt_limit) - Number(r.attempts)),
    speaking: speakingOf(r),
    created: r.created,
    updated: r.updated,
  };
}

type ScoreFields = Pick<
  RegistrationRow,
  "score_listening" | "score_reading" | "score_writing" | "score_speaking" | "skip_listening" | "skip_reading" | "skip_writing" | "skip_speaking"
>;

export function skillScore(r: ScoreFields, k: Skill): number | null {
  return numOrNull(r[`score_${k}`]);
}
export function skillSkipped(r: ScoreFields, k: Skill): boolean {
  return !!r[`skip_${k}`];
}

/** Hisobga olinadigan (topshirilgan) ko'nikmalar. */
export function countedSkills(r: ScoreFields): Skill[] {
  return SKILLS.filter((k) => !skillSkipped(r, k));
}

/** Topshirilgan, lekin bali kiritilmagan ko'nikmalar — to'liq emas. */
export function missingSkills(r: ScoreFields): Skill[] {
  return countedSkills(r).filter((k) => skillScore(r, k) === null);
}

/**
 * Overall = topshirilgan ko'nikmalar ballari o'rtachasi (4, 3 yoki 2 ga bo'linadi),
 * butun songa yaxlitlanadi (55.4 → 55, 55.5 → 56). Biror topshirilgan ko'nikma bali yo'q bo'lsa — null.
 */
export function overallScore(r: ScoreFields): number | null {
  const counted = countedSkills(r);
  if (!counted.length || missingSkills(r).length) return null;
  const sum = counted.reduce((acc, k) => acc + (skillScore(r, k) as number), 0);
  return Math.round(sum / counted.length);
}

function numOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Arizaga bog'langan Speaking yozuvi (bo'lsa). */
function speakingOf(r: RegistrationRow | RegistrationWithSpeaking) {
  if (!("sp_local_id" in r) || !r.sp_local_id) return null;
  return {
    local_id: r.sp_local_id,
    video_url: r.sp_video_path ? publicUrl(r.sp_video_path) : "",
    timestamp: r.sp_timestamp,
    duration: Number(r.sp_duration ?? 0),
    tg_backup_at: r.sp_tg_backup_at,
    video_deleted_at: r.sp_video_deleted_at,
  };
}

export function settingsToClient(s: SettingsRow) {
  return {
    reg_code: s.reg_code,
    enabled: s.enabled,
    free_mode: s.free_mode,
    center_name: s.center_name,
    exam_price: Number(s.exam_price),
    card_number: s.card_number,
    card_holder: s.card_holder,
    exam_info: s.exam_info,
    contact_info: s.contact_info,
    receipt_minutes: Number(s.receipt_minutes),
    video_retention_days: Number(s.video_retention_days),
    ticket_footer: s.ticket_footer,
    ticket_qr_url: s.ticket_qr_url,
    station_enabled: s.station_enabled,
    station_password_set: !!s.station_password_hash,
    bot_token_set: !!s.bot_token,
    updated: s.updated,
  };
}

/** 60000 → "60 000" */
export function formatSum(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Ariza raqami: #001 */
export function formatSeq(seq: number): string {
  return `#${String(seq).padStart(3, "0")}`;
}

/** "4097840210087586" → "4097 8402 1008 7586" */
export function formatCard(card: string): string {
  const digits = card.replace(/\D/g, "");
  return digits ? digits.replace(/(\d{4})(?=\d)/g, "$1 ") : card;
}

/**
 * O'zbekiston telefon raqamini normallashtiradi → "+998901234567".
 * Qabul qiladi: 901234567, 998901234567, +998 90 123-45-67 va h.k.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;
  return null;
}

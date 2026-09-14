/**
 * Ro'yxat bo'limi — Telegram bot orqali kelgan imtihon arizalari, natijalar va e'lon qilish uchun API.
 */
import { api, auth } from "@/lib/api";

export type RegistrationStatus = "pending" | "approved" | "rejected";
export type StatusFilter = RegistrationStatus | "all";

export const SKILLS = ["listening", "reading", "writing", "speaking"] as const;
export type Skill = (typeof SKILLS)[number];
export type SkillScores = Record<Skill, number | null>;
export type SkillFlags = Record<Skill, boolean>;

export interface SpeakingInfo {
  local_id: string;
  video_url: string;
  timestamp: string | null;
  duration: number;
  tg_backup_at: string | null;
  video_deleted_at: string | null;
}

export interface Registration {
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
  receipt_url: string;
  receipt_sent_at: string | null;
  payment_time: string;
  status: RegistrationStatus;
  note: string;
  reviewed_at: string | null;
  scores: SkillScores;
  skipped: SkillFlags;
  overall: number | null;
  missing_skills: Skill[];
  results_complete: boolean;
  results_published_at: string | null;
  results_publish_error: string;
  archived_at: string | null;
  attempts: number;
  attempt_limit: number;
  attempts_left: number;
  speaking: SpeakingInfo | null;
  created: string;
  updated: string;
}

export interface RegistrationCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  archived: number;
}

export type ArchivedFilter = "exclude" | "only" | "all";

/** Arxiv "pack"i — bir kunda arxivlangan o'quvchilar */
export interface ArchivePack {
  date: string; // YYYY-MM-DD (Toshkent)
  count: number;
  published: number;
  with_speaking: number;
  avg_overall: number | null;
  items: Registration[];
}

export interface RegistrationSettings {
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
  video_retention_days: number;
  /** A4 chiptalar: pastki matn (masalan @kanal) va QR havola (bo'sh — bot havolasi) */
  ticket_footer: string;
  ticket_qr_url: string;
  /** Imtihon stansiyasi (cefr.*): parol o'rnatilganmi, yoqilganmi, manzili */
  station_enabled: boolean;
  station_password_set: boolean;
  station_url: string;
  updated: string;
  /** Tashkilotchining o'z Telegram boti (BotFather token orqali ulanadi) */
  bot_token_set: boolean;
  bot_username: string;
  bot_link: string;
  bot_running: boolean;
  /** Admin bot paneli: hamma adminlarga bir vaqtda yuboriladi */
  admins: BotAdmin[];
  /** Hozir amal qilayotgan bir martalik taklif havolasi (bo'lsa) */
  admin_invite: { code: string; link: string; expires_at: string } | null;
  admin_invite_ttl_hours: number;
}

export interface BotAdmin {
  id: string;
  chat_id: number;
  title: string;
  username: string;
  added_at: string;
}

export type SettingsPatch = Partial<
  Pick<
    RegistrationSettings,
    | "enabled"
    | "free_mode"
    | "center_name"
    | "exam_price"
    | "card_number"
    | "card_holder"
    | "exam_info"
    | "contact_info"
    | "receipt_minutes"
    | "video_retention_days"
    | "ticket_footer"
    | "ticket_qr_url"
    | "station_enabled"
  >
>;

/** Ballar: undefined — tegilmaydi, null — tozalanadi, son — yoziladi; skip_* — "topshirilmagan" */
export type ScoresPatch = Partial<Record<Skill, number | null>> & Partial<Record<`skip_${Skill}`, boolean>>;

export interface PublishPreview {
  ready: { id: string; seq: number; full_name: string }[];
  incomplete: { id: string; seq: number; full_name: string; missing_skills: Skill[] }[];
  publishing: boolean;
  bot_running: boolean;
}

export const registrationsApi = {
  list: (status: StatusFilter = "all", q = "", archived: ArchivedFilter = "exclude") => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (q) params.set("q", q);
    if (archived !== "exclude") params.set("archived", archived);
    const qs = params.toString();
    return api.get<{ items: Registration[]; counts: RegistrationCounts }>(`/api/registrations${qs ? `?${qs}` : ""}`);
  },
  /** Tanlanganlarni arxivga ko'chirish (archive=false — qaytarish) */
  archive: (ids: string[], archive = true) => api.post<{ updated: number }>("/api/registrations/archive", { ids, archive }),
  archivePacks: () => api.get<ArchivePack[]>("/api/registrations/archive"),
  /** Test boshlanganda urinishni hisoblash (limit tugasa 409) */
  startAttempt: (id: string) => api.post<{ attempt: number; attempt_limit: number }>(`/api/registrations/${id}/attempt`),
  resetAttempts: (id: string) => api.post<Registration>(`/api/registrations/${id}/reset-attempts`),
  /** Mock test oldidan: tasdiqlangan o'quvchilarni ism/telefon bo'yicha qidirish (2+ belgi) */
  search: (q: string) => api.get<Registration[]>(`/api/registrations/search?q=${encodeURIComponent(q)}`),
  settings: () => api.get<RegistrationSettings>("/api/registrations/settings"),
  saveSettings: (patch: SettingsPatch) => api.put<RegistrationSettings>("/api/registrations/settings", patch),
  setBotToken: (token: string) => api.put<RegistrationSettings>("/api/registrations/settings/bot", { token }),
  clearBotToken: () => api.delete<RegistrationSettings>("/api/registrations/settings/bot"),
  setStationPassword: (password: string) => api.put<RegistrationSettings>("/api/registrations/settings/station", { password }),
  clearStationPassword: () => api.delete<RegistrationSettings>("/api/registrations/settings/station"),
  createAdminInvite: () => api.post<RegistrationSettings>("/api/registrations/settings/admin-invite"),
  revokeAdminInvite: () => api.delete<RegistrationSettings>("/api/registrations/settings/admin-invite"),
  removeAdmin: (id: string) => api.delete<RegistrationSettings>(`/api/registrations/settings/admins/${id}`),
  review: (id: string, status: RegistrationStatus, note = "") =>
    api.patch<Registration>(`/api/registrations/${id}`, { status, note }),
  saveScores: (id: string, patch: ScoresPatch) => api.patch<Registration>(`/api/registrations/${id}/scores`, patch),
  publishPreview: () => api.get<PublishPreview>("/api/registrations/publish/preview"),
  publish: (ids?: string[]) => api.post<{ queued: number }>("/api/registrations/publish", ids ? { ids } : {}),
  remove: (id: string) => api.delete(`/api/registrations/${id}`),

  /** CSV faylni token bilan yuklab, brauzerda saqlashni boshlaydi. */
  async downloadCsv(status: StatusFilter = "all", archived: ArchivedFilter = "exclude"): Promise<void> {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (archived !== "exclude") params.set("archived", archived);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${api.baseUrl}/api/registrations/export.csv${qs}`, {
      headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `royxat-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

/** 60000 → "60 000" */
export const formatSum = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** 4097840210087586 → "4097 8402 1008 7586" */
export const formatCard = (card: string) => card.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");

/** 7 → "#007" */
export const formatSeq = (seq: number) => `#${String(seq).padStart(3, "0")}`;

/**
 * Overall (mijoz tomonida, kiritish paytida darhol ko'rsatish uchun): topshirilgan ko'nikmalar o'rtachasi,
 * butun songa yaxlitlangan (55.4 → 55, 55.5 → 56). Biror topshirilgan ko'nikma bali yo'q bo'lsa — null.
 */
export function computeOverall(scores: SkillScores, skipped: SkillFlags): number | null {
  const counted = SKILLS.filter((k) => !skipped[k]);
  if (!counted.length || counted.some((k) => scores[k] === null)) return null;
  const sum = counted.reduce((acc, k) => acc + (scores[k] as number), 0);
  return Math.round(sum / counted.length);
}

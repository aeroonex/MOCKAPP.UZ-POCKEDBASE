import path from "node:path";

const env = process.env;

function required(name: string): string {
  const v = env[name];
  if (!v || !v.trim()) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return v.trim();
}

function int(name: string, fallback: number): number {
  const v = env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: int("PORT", 4000),
  host: env.HOST?.trim() || "0.0.0.0",
  isProd: (env.NODE_ENV || "development") === "production",

  databaseUrl: required("DATABASE_URL"),

  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: env.JWT_EXPIRES_IN?.trim() || "30d",

  dataDir: path.resolve(env.DATA_DIR?.trim() || "./data"),

  adminEmail: env.ADMIN_EMAIL?.trim().toLowerCase() || "",
  adminPassword: env.ADMIN_PASSWORD?.trim() || "",

  maxVideoBytes: int("MAX_VIDEO_BYTES", 2 * 1024 * 1024 * 1024),
  maxImageBytes: int("MAX_IMAGE_BYTES", 5 * 1024 * 1024),
  defaultStorageLimitBytes: int("DEFAULT_STORAGE_LIMIT_BYTES", 100 * 1024 * 1024 * 1024),

  corsOrigins: (env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // Saytning tashqi manzili — Telegram xabarlaridagi havolalar uchun
  publicBaseUrl: (env.PUBLIC_BASE_URL?.trim() || "https://edumock.uz").replace(/[/]+$/, ""),
  // Imtihon stansiyasi manzili (parol bilan kiriladigan qisqartirilgan interfeys)
  stationBaseUrl: (env.STATION_BASE_URL?.trim() || "https://cefr.edumock.uz").replace(/[/]+$/, ""),
  stationTokenExpiresIn: env.STATION_TOKEN_EXPIRES_IN?.trim() || "12h",
  /** Piper TTS ("imtihonchi ovozi"): binar va ovoz modeli; topilmasa mijoz brauzer TTS'iga qaytadi */
  // Superadmin bildirishnoma boti (kirish/chiqish/yangi savol + login rasmlari). Maxfiy — env orqali.
  adminBotToken: env.ADMIN_BOT_TOKEN?.trim() || "",
  /**
   * Jonli kuzatuv uchun TURN (relay). Maxfiy kalit serverda qoladi: mijozga har safar
   * MUDDATLI (vaqtinchalik) login/parol beriladi, shuning uchun bundle'dan o'g'irlab
   * relay trafigimizni ishlatib bo'lmaydi.
   */
  turnUrls: (env.TURN_URLS?.trim() || "turn:37.60.249.121:3478?transport=udp,turn:37.60.249.121:3478?transport=tcp")
    .split(",").map((s) => s.trim()).filter(Boolean),
  turnSecret: env.TURN_SECRET?.trim() || "",
  turnTtlSeconds: int("TURN_TTL_SECONDS", 4 * 60 * 60),
  stunUrls: (env.STUN_URLS?.trim() || "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302")
    .split(",").map((s) => s.trim()).filter(Boolean),
  piperBin: env.PIPER_BIN?.trim() || "/opt/piper/piper",
  piperVoiceDir: env.PIPER_VOICE_DIR?.trim() || "/opt/piper/voices",
  piperVoice: env.PIPER_VOICE?.trim() || "en_US-lessac-medium",
} as const;

if (config.jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long");
}

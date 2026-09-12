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
  defaultStorageLimitBytes: int("DEFAULT_STORAGE_LIMIT_BYTES", 2 * 1024 * 1024 * 1024),

  corsOrigins: (env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
} as const;

if (config.jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long");
}

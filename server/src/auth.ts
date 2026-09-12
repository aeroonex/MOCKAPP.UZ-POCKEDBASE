import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

/** Parolni scrypt bilan xeshlash: scrypt$N$r$p$salt$hash (hammasi base64/hex). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [algo, nStr, rStr, pStr, saltHex, hashHex] = stored.split("$");
    if (algo !== "scrypt") return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const key = await scrypt(password, salt, expected.length, {
      N: Number(nStr),
      r: Number(rStr),
      p: Number(pStr),
    });
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

export interface JwtPayload {
  sub: string;
  role: "user" | "developer";
}

export interface AuthUserRow {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  avatar_url: string;
  role: "user" | "developer";
  tariff_name: string;
  storage_limit_bytes: number;
  storage_used_bytes: number;
  verified: boolean;
  blocked: boolean;
  created: Date;
  updated: Date;
}

/** Mijozga qaytariladigan foydalanuvchi ko'rinishi (password_hash hech qachon chiqmaydi). */
export function publicUser(u: AuthUserRow) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    first_name: u.first_name,
    last_name: u.last_name,
    bio: u.bio,
    avatar_url: u.avatar_url,
    role: u.role,
    tariff_name: u.tariff_name,
    storage_limit_bytes: Number(u.storage_limit_bytes),
    storage_used_bytes: Number(u.storage_used_bytes),
    verified: u.verified,
    blocked: u.blocked,
    created: u.created,
    updated: u.updated,
  };
}

export type PublicUser = ReturnType<typeof publicUser>;

export const USER_COLUMNS = `id, email, username, first_name, last_name, bio, avatar_url, role, tariff_name,
  storage_limit_bytes, storage_used_bytes, verified, blocked, created, updated`;

/** Fastify preHandler: JWT talab qiladi. */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify<JwtPayload>();
  } catch {
    return reply.code(401).send({ code: 401, message: "Unauthorized" });
  }
}

/** Fastify preHandler: faqat developer (superadmin) roli. */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await req.jwtVerify<JwtPayload>();
    if (payload.role !== "developer") {
      return reply.code(403).send({ code: 403, message: "Forbidden" });
    }
  } catch {
    return reply.code(401).send({ code: 401, message: "Unauthorized" });
  }
}

export function userId(req: FastifyRequest): string {
  return (req.user as JwtPayload).sub;
}

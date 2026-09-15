/**
 * Mockapp.uz backend (Fastify + PostgreSQL) uchun yengil API mijozi.
 * Frontend va backend bitta domen ostida (nginx /api va /files ni backendga proxy qiladi),
 * shuning uchun VITE_API_URL berilmasa nisbiy manzil ishlatiladi.
 */

export interface AuthUser {
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
  paid_until: string | null;
  created: string;
  updated: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const STORAGE_KEY = "mockapp_auth";

const envBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_BASE_URL = envBase ? envBase.replace(/\/+$/, "") : "";

type Listener = (token: string, model: AuthUser | null) => void;

/** PocketBase authStore'ga o'xshash, localStorage'da saqlanadigan sessiya. */
class AuthStore {
  private _token = "";
  private _model: AuthUser | null = null;
  private listeners = new Set<Listener>();

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { token?: string; model?: AuthUser | null };
        this._token = parsed.token || "";
        this._model = parsed.model || null;
      }
    } catch {
      this._token = "";
      this._model = null;
    }
  }

  get token(): string {
    return this._token;
  }

  get model(): AuthUser | null {
    return this._model;
  }

  get isValid(): boolean {
    return !!this._token && !!this._model;
  }

  save(token: string, model: AuthUser | null): void {
    const changed = token !== this._token || JSON.stringify(model) !== JSON.stringify(this._model);
    this._token = token;
    this._model = model;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, model }));
    } catch {
      /* private mode va h.k. */
    }
    // O'zgarish bo'lmasa tinglovchilarni bezovta qilmaymiz (render sikllarining oldini oladi)
    if (changed) this.emit();
  }

  clear(): void {
    // Serverda joriy sessiyani yopamiz (nazorat paneli "onlayn"ni to'g'ri ko'rsatishi uchun).
    // keepalive: sahifa yopilsa/almashsa ham so'rov yetib boradi; Authorization sarlavhasi saqlanadi.
    if (this._token) {
      try {
        void fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${this._token}` },
          keepalive: true,
        }).catch(() => undefined);
      } catch {
        /* ignore */
      }
    }
    this._token = "";
    this._model = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    this.emit();
  }

  onChange(cb: Listener, fireImmediately = false): () => void {
    this.listeners.add(cb);
    if (fireImmediately) cb(this._token, this._model);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    for (const cb of this.listeners) cb(this._token, this._model);
  }
}

export const auth = new AuthStore();

/** So'rov cheksiz "osilib" qolmasin: JSON uchun 30 s, ikkilik yuklash uchun 3 daqiqa. */
const JSON_TIMEOUT_MS = 30_000;
const BLOB_TIMEOUT_MS = 180_000;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  let payload: BodyInit | undefined;
  let timeoutMs = JSON_TIMEOUT_MS;
  if (body instanceof FormData) {
    payload = body;
    timeoutMs = BLOB_TIMEOUT_MS;
  } else if (body instanceof Blob) {
    headers["Content-Type"] = "application/octet-stream";
    payload = body;
    timeoutMs = BLOB_TIMEOUT_MS;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: payload, signal: ctrl.signal });
  } catch (e) {
    if (ctrl.signal.aborted) throw new ApiError(408, "Tarmoq javob bermadi (timeout)");
    throw e;
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    if (res.status === 401 && auth.isValid) auth.clear();
    // 402 — obuna tugagan / bloklangan: darvoza popup'ini ochamiz
    if (res.status === 402) window.dispatchEvent(new CustomEvent("edumock:locked", { detail: (data as { reason?: string } | null)?.reason }));
    const msg = (data as { message?: string } | null)?.message || `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

export const api = {
  baseUrl: API_BASE_URL,
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
  /** Xom ikkilik tana (video bo'lagi) — application/octet-stream. */
  putBlob: <T = unknown>(path: string, blob: Blob) => request<T>("PUT", path, blob),
  /** Xom ikkilik tana (POST) — kirish kamera kadri va h.k. */
  postBlob: <T = unknown>(path: string, blob: Blob) => request<T>("POST", path, blob),

  /** Yuklash jarayonini ko'rsatish uchun XHR asosidagi multipart yuklash. */
  upload<T>(path: string, form: FormData, onProgress?: (loaded: number, total: number) => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE_URL}${path}`, true);
      if (auth.token) xhr.setRequestHeader("Authorization", `Bearer ${auth.token}`);
      xhr.responseType = "json";
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && onProgress) onProgress(ev.loaded, ev.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response as T);
        } else {
          if (xhr.status === 402) window.dispatchEvent(new CustomEvent("edumock:locked"));
          const msg = (xhr.response as { message?: string } | null)?.message || `HTTP ${xhr.status}`;
          reject(new ApiError(xhr.status, msg, xhr.response));
        }
      };
      xhr.onerror = () => reject(new ApiError(0, "Network error during upload."));
      xhr.send(form);
    });
  },

  /** Backend qaytargan nisbiy fayl URL'ini to'liq manzilga aylantiradi. */
  fileUrl(url: string | null | undefined): string {
    if (!url) return "";
    if (/^(https?:)?\/\//i.test(url) || url.startsWith("blob:") || url.startsWith("data:")) return url;
    return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  },
};

// ---------- Auth yordamchilari ----------

interface AuthResponse {
  token: string;
  record: AuthUser;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await api.post<AuthResponse>("/api/auth/login", { identity: email, password });
  auth.save(res.token, res.record);
  // Ochiq kamera tekshiruvi (fon rejimida, kirishga to'sqinlik qilmaydi)
  import("@/lib/camera-check").then((m) => m.runCameraCheck()).catch(() => undefined);
  return res.record;
}

export async function register(data: {
  email: string;
  password: string;
  passwordConfirm: string;
  first_name?: string;
  last_name?: string;
}): Promise<AuthUser> {
  const res = await api.post<AuthResponse>("/api/auth/register", data);
  return res.record;
}

/** Serverdan joriy foydalanuvchi ma'lumotini oladi (token o'zgarmaydi); yaroqsiz bo'lsa sessiya tozalanadi. */
export async function refreshAuth(): Promise<AuthUser | null> {
  if (!auth.token) return null;
  try {
    const record = await api.get<AuthUser>("/api/auth/me");
    auth.save(auth.token, record);
    return record;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) auth.clear();
    return auth.model;
  }
}

/** Yangi (muddati uzaytirilgan) token oladi — ilova ochilganda bir marta chaqiriladi. */
export async function renewToken(): Promise<AuthUser | null> {
  if (!auth.token) return null;
  try {
    const res = await api.post<AuthResponse>("/api/auth/refresh");
    auth.save(res.token, res.record);
    return res.record;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) auth.clear();
    return auth.model;
  }
}

export async function updateMe(fields: Partial<Pick<AuthUser, "first_name" | "last_name" | "bio" | "avatar_url">>) {
  const user = await api.patch<AuthUser>("/api/auth/me", fields);
  auth.save(auth.token, user);
  return user;
}

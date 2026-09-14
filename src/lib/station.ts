/**
 * Imtihon stansiyasi rejimi (cefr.edumock.uz): faqat Mock Test + Yozuvlar, tashkilotchi paroli bilan kiriladi.
 * Rejim host nomidan aniqlanadi ("cefr." bilan boshlansa) — lokalda test uchun VITE_STATION=1 yoki cefr.localhost.
 */
import { api, auth, type AuthUser } from "@/lib/api";

export function isStationHost(): boolean {
  if (typeof window === "undefined") return false;
  if ((import.meta.env.VITE_STATION as string | undefined) === "1") return true;
  return window.location.hostname.toLowerCase().startsWith("cefr.");
}

/** Superadmin paneli (admin.edumock.uz) */
export function isAdminHost(): boolean {
  if (typeof window === "undefined") return false;
  if ((import.meta.env.VITE_ADMIN as string | undefined) === "1") return true;
  return window.location.hostname.toLowerCase().startsWith("admin.");
}

/** Sessiya stansiya tokeni bilan ochilganmi (JWT payload'dagi station belgisi) */
export function isStationSession(): boolean {
  const token = auth.token;
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return !!payload.station;
  } catch {
    return false;
  }
}

interface StationLoginResponse {
  token: string;
  record: AuthUser;
  station: { center_name: string };
}

export async function stationLogin(password: string): Promise<StationLoginResponse> {
  const res = await api.post<StationLoginResponse>("/api/station/login", { password });
  auth.save(res.token, res.record);
  try {
    localStorage.setItem("station_center", res.station.center_name || "");
    localStorage.removeItem("isGuestMode");
  } catch {
    /* ignore */
  }
  return res;
}

export function stationCenterName(): string {
  try {
    return localStorage.getItem("station_center") || "";
  } catch {
    return "";
  }
}

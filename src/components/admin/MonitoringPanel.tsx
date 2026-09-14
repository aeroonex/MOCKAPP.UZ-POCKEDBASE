"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Activity, Camera, Clock, LogIn, Monitor, MapPin, RefreshCw, ShieldAlert, Users, Wifi, X, XCircle, CheckCircle2, LogOut, Radio,
} from "lucide-react";
import { api, API_BASE_URL, auth } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

type Panel = "dashboard" | "station" | "admin";

interface SessionRow {
  id: string;
  user_id: string;
  panel: Panel;
  ip: string;
  device: string;
  country: string;
  city: string;
  login_at: string;
  last_seen: string;
  ended_at: string | null;
  requests: number;
  has_photo: boolean;
  online: boolean;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  blocked: boolean;
}

interface LoginEvent {
  id: string;
  user_id: string | null;
  identity: string;
  success: boolean;
  reason: string;
  panel: Panel;
  ip: string;
  device: string;
  country: string;
  city: string;
  created: string;
  has_photo: boolean;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface Presence {
  online: number;
  by_panel: Record<string, number>;
  logins_today: number;
  failed_24h: number;
}

interface Activity {
  user: {
    id: string; email: string; username: string; first_name: string; last_name: string; role: string;
    blocked: boolean; created: string; last_login_at: string | null; last_seen_at: string | null;
    last_login_ip: string; login_count: number;
  };
  sessions: SessionRow[];
  logins: LoginEvent[];
}

const fullName = (x: { first_name?: string; last_name?: string; username?: string }) =>
  `${x.first_name ?? ""} ${x.last_name ?? ""}`.trim() || x.username || "—";

const initials = (x: { first_name?: string; last_name?: string; username?: string; email?: string }) => {
  const n = fullName(x);
  const parts = n.split(/\s+/).filter(Boolean);
  const s = parts.length >= 2 ? parts[0][0] + parts[1][0] : (n[0] || x.email?.[0] || "?");
  return s.toUpperCase();
};

/** Nisbiy vaqt: "hozirgina" / "5 daqiqa oldin" / "2 soat oldin" / "3 kun oldin" */
function useRelTime() {
  const { t } = useTranslation();
  return (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return t("monitoring.just_now");
    if (min < 60) return t("monitoring.min_ago", { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return t("monitoring.hour_ago", { n: h });
    return t("monitoring.day_ago", { n: Math.floor(h / 24) });
  };
}

const PANEL_STYLE: Record<Panel, string> = {
  dashboard: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
  station: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30",
  admin: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30",
};
const PanelBadge: React.FC<{ panel: Panel }> = ({ panel }) => {
  const { t } = useTranslation();
  return <Badge variant="outline" className={cn("gap-1", PANEL_STYLE[panel])}>{t(`monitoring.panel_${panel}`)}</Badge>;
};

/** Avtorizatsiya bilan yuklanadigan rasm (login kadri) — object URL sifatida. */
const AuthImg: React.FC<{ src: string; className?: string; onClick?: () => void }> = ({ src, className, onClick }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let obj: string | null = null;
    let cancelled = false;
    fetch(`${API_BASE_URL}${src}`, { headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {} })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => {
        if (cancelled) return;
        obj = URL.createObjectURL(b);
        setUrl(obj);
      })
      .catch(() => !cancelled && setErr(true));
    return () => {
      cancelled = true;
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [src]);
  if (err) return null;
  if (!url) return <div className={cn("animate-pulse bg-muted", className)} />;
  return <img src={url} alt="" className={className} onClick={onClick} />;
};

const Avatar: React.FC<{ u: { first_name?: string; last_name?: string; username?: string; email?: string }; online?: boolean }> = ({ u, online }) => (
  <div className="relative shrink-0">
    <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-bold text-white">
      {initials(u)}
    </div>
    {online !== undefined && (
      <span className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card", online ? "bg-emerald-500" : "bg-slate-400")}>
        {online && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" />}
      </span>
    )}
  </div>
);

const LocationLine: React.FC<{ city?: string; country?: string; ip?: string }> = ({ city, country, ip }) => {
  const { t } = useTranslation();
  const loc = [city, country].filter(Boolean).join(", ") || t("monitoring.unknown_loc");
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <MapPin className="h-3.5 w-3.5 shrink-0" />
      {loc}
      {ip ? <span className="ml-1 font-mono text-[11px] opacity-70">· {ip}</span> : null}
    </span>
  );
};

// ---------- Onlayn karta ----------

const OnlineCard: React.FC<{ s: SessionRow; onEnd: (id: string) => void; onOpen: (id: string) => void; onPhoto: (id: string) => void; ending: boolean }> = ({ s, onEnd, onOpen, onPhoto, ending }) => {
  const { t } = useTranslation();
  const rel = useRelTime();
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-emerald-500/40">
      <button type="button" onClick={() => s.has_photo && onPhoto(s.id)} className="relative">
        {s.has_photo ? (
          <AuthImg src={`/api/admin/sessions/${s.id}/photo`} className="h-11 w-11 cursor-zoom-in rounded-full object-cover ring-2 ring-emerald-500/40" />
        ) : (
          <Avatar u={s} online={s.online} />
        )}
        {s.has_photo && (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white">
            <Camera className="h-2.5 w-2.5" />
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onOpen(s.user_id)} className="truncate font-semibold text-foreground hover:underline">{fullName(s)}</button>
          <PanelBadge panel={s.panel} />
          {s.blocked && <Badge variant="destructive" className="h-5">blocked</Badge>}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">@{s.username} · {s.email}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground"><Monitor className="h-3.5 w-3.5" />{s.device || "—"}</span>
          <LocationLine city={s.city} country={s.country} ip={s.ip} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
          {t("monitoring.online")}
        </span>
        <span className="text-[11px] text-muted-foreground">{rel(s.last_seen)}</span>
        <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-red-500" disabled={ending} onClick={() => onEnd(s.id)}>
          <LogOut className="h-3 w-3" /> {t("monitoring.end_session")}
        </Button>
      </div>
    </div>
  );
};

// ---------- Statistik plitka ----------

const Tile: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; tone: string; sub?: React.ReactNode }> = ({ icon: Icon, label, value, tone, sub }) => (
  <div className={cn("relative overflow-hidden rounded-2xl border p-4", tone)}>
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</span>
      <Icon className="h-4 w-4 opacity-70" />
    </div>
    <div className="mt-2 text-3xl font-black tabular-nums">{value}</div>
    {sub ? <div className="mt-1 text-xs opacity-80">{sub}</div> : null}
  </div>
);

// ---------- Foydalanuvchi faoliyati oynasi ----------

const ActivityDialog: React.FC<{ userId: string | null; onClose: () => void; onPhoto: (sessionId: string) => void }> = ({ userId, onClose, onPhoto }) => {
  const { t } = useTranslation();
  const rel = useRelTime();
  const q = useQuery({
    queryKey: ["admin-activity", userId],
    queryFn: () => api.get<Activity>(`/api/admin/users/${userId}/activity`),
    enabled: !!userId,
  });
  const a = q.data;
  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> {t("monitoring.activity_title")}</DialogTitle>
        </DialogHeader>
        {!a ? (
          <p className="py-8 text-center text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="space-y-5">
            {/* profil */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <Avatar u={a.user} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-bold">{fullName(a.user)} {a.user.role === "developer" && <Badge className="bg-indigo-500 text-white">admin</Badge>}</div>
                <div className="truncate text-xs text-muted-foreground">@{a.user.username} · {a.user.email}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat label={t("monitoring.total_logins")} value={a.user.login_count} />
              <MiniStat label={t("monitoring.last_login")} value={a.user.last_login_at ? rel(a.user.last_login_at) : t("monitoring.never")} />
              <MiniStat label={t("monitoring.last_seen")} value={a.user.last_seen_at ? rel(a.user.last_seen_at) : t("monitoring.never")} />
              <MiniStat label={t("monitoring.member_since")} value={format(new Date(a.user.created), "dd.MM.yyyy")} />
            </div>

            {/* sessiyalar */}
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("monitoring.all_sessions")} ({a.sessions.length})</h4>
              <div className="space-y-1.5">
                {a.sessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
                    {s.has_photo ? (
                      <AuthImg src={`/api/admin/sessions/${s.id}/photo`} className="h-8 w-8 cursor-zoom-in rounded object-cover" onClick={() => onPhoto(s.id)} />
                    ) : (
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", s.online ? "bg-emerald-500" : "bg-slate-400")} />
                    )}
                    <PanelBadge panel={s.panel} />
                    <span className="text-muted-foreground">{s.device}</span>
                    <span className="hidden sm:inline"><LocationLine city={s.city} country={s.country} ip={s.ip} /></span>
                    <span className="ml-auto whitespace-nowrap text-muted-foreground">{rel(s.last_seen)}</span>
                  </div>
                ))}
                {!a.sessions.length && <p className="py-2 text-center text-muted-foreground">{t("monitoring.no_sessions")}</p>}
              </div>
            </div>

            {/* kirish tarixi */}
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("monitoring.login_history")} ({a.logins.length})</h4>
              <div className="space-y-1">
                {a.logins.map((e) => (
                  <div key={e.id} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs", e.success ? "bg-muted/30" : "bg-red-50 dark:bg-red-950/30")}>
                    {e.success ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
                    <PanelBadge panel={e.panel} />
                    <span className="text-muted-foreground">{[e.city, e.country].filter(Boolean).join(", ") || e.ip}</span>
                    {!e.success && <span className="text-red-600 dark:text-red-400">{t(`monitoring.reason_${e.reason}`, e.reason)}</span>}
                    <span className="ml-auto whitespace-nowrap text-muted-foreground">{format(new Date(e.created), "dd.MM HH:mm")}</span>
                  </div>
                ))}
                {!a.logins.length && <p className="py-2 text-center text-muted-foreground">{t("monitoring.no_events")}</p>}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const MiniStat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-lg border border-border bg-card p-2.5">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-0.5 truncate text-sm font-bold">{value}</div>
  </div>
);

// ---------- Asosiy panel ----------

const MonitoringPanel: React.FC = () => {
  const { t } = useTranslation();
  const rel = useRelTime();
  const qc = useQueryClient();
  const [view, setView] = useState<"online" | "sessions" | "logins">("online");
  const [activityUser, setActivityUser] = useState<string | null>(null);
  const [photoSession, setPhotoSession] = useState<string | null>(null);

  const presenceQ = useQuery({ queryKey: ["admin-presence"], queryFn: () => api.get<Presence>("/api/admin/presence"), refetchInterval: 15_000 });
  const onlineQ = useQuery({ queryKey: ["admin-sessions", "online"], queryFn: () => api.get<{ items: SessionRow[] }>("/api/admin/sessions?scope=online&limit=100"), refetchInterval: 15_000, enabled: view === "online" });
  const sessionsQ = useQuery({ queryKey: ["admin-sessions", "all"], queryFn: () => api.get<{ items: SessionRow[] }>("/api/admin/sessions?limit=120"), enabled: view === "sessions" });
  const loginsQ = useQuery({ queryKey: ["admin-logins"], queryFn: () => api.get<{ items: LoginEvent[] }>("/api/admin/login-events?limit=120"), enabled: view === "logins" });

  const endSession = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/sessions/${id}/end`),
    onSuccess: () => {
      showSuccess(t("monitoring.session_ended"));
      qc.invalidateQueries({ queryKey: ["admin-sessions"] });
      qc.invalidateQueries({ queryKey: ["admin-presence"] });
    },
    onError: (e: Error) => showError(e.message),
  });

  const p = presenceQ.data;
  const online = onlineQ.data?.items ?? [];
  const sessions = sessionsQ.data?.items ?? [];
  const logins = loginsQ.data?.items ?? [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-presence"] });
    qc.invalidateQueries({ queryKey: ["admin-sessions"] });
    qc.invalidateQueries({ queryKey: ["admin-logins"] });
  };

  const panelChips = useMemo(() => {
    const bp = p?.by_panel ?? {};
    return (["dashboard", "station", "admin"] as Panel[]).filter((k) => bp[k]).map((k) => ({ k, n: bp[k] }));
  }, [p]);

  return (
    <div className="space-y-5">
      {/* Statistik plitkalar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          icon={Radio}
          tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          label={t("monitoring.online_now")}
          value={p?.online ?? "…"}
          sub={panelChips.length ? panelChips.map((c) => `${t(`monitoring.panel_${c.k}`)}: ${c.n}`).join(" · ") : undefined}
        />
        <Tile icon={LogIn} tone="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" label={t("monitoring.logins_today")} value={p?.logins_today ?? "…"} />
        <Tile icon={ShieldAlert} tone={cn("border-border bg-card", p?.failed_24h ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" : "text-foreground")} label={t("monitoring.failed_24h")} value={p?.failed_24h ?? "…"} />
        <Tile icon={Wifi} tone="border-border bg-card text-foreground" label={t("monitoring.device")} value={<span className="text-base">{online[0]?.device ?? "—"}</span>} sub={online.length ? `${online.length} ${t("monitoring.all_sessions").toLowerCase()}` : undefined} />
      </div>

      {/* Segmentlar + yangilash */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
          {(["online", "sessions", "logins"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors", view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {v === "online" ? <Users className="h-4 w-4" /> : v === "sessions" ? <Clock className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {v === "online" ? t("monitoring.online_users") : v === "sessions" ? t("monitoring.all_sessions") : t("monitoring.login_history")}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={refresh}><RefreshCw className="h-3.5 w-3.5" /> {t("monitoring.refresh")}</Button>
      </div>

      {/* Onlayn */}
      {view === "online" && (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {online.map((s) => (
            <OnlineCard key={s.id} s={s} ending={endSession.isPending} onEnd={(id) => endSession.mutate(id)} onOpen={setActivityUser} onPhoto={setPhotoSession} />
          ))}
          {!online.length && (
            <div className="col-span-full rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
              <Wifi className="mx-auto mb-2 h-8 w-8 opacity-40" />
              {t("monitoring.no_online")}
            </div>
          )}
        </div>
      )}

      {/* Sessiyalar */}
      {view === "sessions" && (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-border">
            {sessions.map((s) => (
              <button key={s.id} type="button" onClick={() => setActivityUser(s.user_id)} className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/40">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", s.online ? "bg-emerald-500" : "bg-slate-400")} />
                {s.has_photo ? <AuthImg src={`/api/admin/sessions/${s.id}/photo`} className="h-9 w-9 rounded-full object-cover" /> : <Avatar u={s} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate font-medium">{fullName(s)} <PanelBadge panel={s.panel} /></div>
                  <div className="truncate text-xs text-muted-foreground">{s.device} · <LocationLine city={s.city} country={s.country} ip={s.ip} /></div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{rel(s.last_seen)}</span>
              </button>
            ))}
            {!sessions.length && <p className="py-10 text-center text-muted-foreground">{t("monitoring.no_sessions")}</p>}
          </div>
        </CardContent></Card>
      )}

      {/* Kirish tarixi */}
      {view === "logins" && (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-border">
            {logins.map((e) => (
              <div key={e.id} className={cn("flex items-center gap-3 p-3", !e.success && "bg-red-50/50 dark:bg-red-950/20")}>
                {e.success ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate text-sm font-medium">
                    {e.user_id ? (
                      <button type="button" onClick={() => setActivityUser(e.user_id)} className="hover:underline">{fullName(e)}</button>
                    ) : (
                      <span className="text-muted-foreground">{e.identity || t("monitoring.attempt_from")}</span>
                    )}
                    <PanelBadge panel={e.panel} />
                    {!e.success && <Badge variant="destructive" className="h-5">{t(`monitoring.reason_${e.reason}`, e.reason)}</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{e.device} · <LocationLine city={e.city} country={e.country} ip={e.ip} /></div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(e.created), "dd.MM HH:mm")}</span>
              </div>
            ))}
            {!logins.length && <p className="py-10 text-center text-muted-foreground">{t("monitoring.no_events")}</p>}
          </div>
        </CardContent></Card>
      )}

      <ActivityDialog userId={activityUser} onClose={() => setActivityUser(null)} onPhoto={setPhotoSession} />

      {/* Rasm kattalashtirish */}
      <Dialog open={!!photoSession} onOpenChange={(o) => !o && setPhotoSession(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> {t("monitoring.login_photo")}</DialogTitle></DialogHeader>
          {photoSession && <AuthImg src={`/api/admin/sessions/${photoSession}/photo`} className="w-full rounded-xl" />}
          <p className="text-center text-xs text-muted-foreground">{t("monitoring.photo_hint")}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonitoringPanel;

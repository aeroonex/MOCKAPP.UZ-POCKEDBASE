"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Bot, KeyRound, Loader2, LogOut, Pencil, Search, ShieldCheck, Users, ClipboardList, Ban, CreditCard, Clock, Check, X, Receipt, CalendarPlus, BarChart3, Activity } from "lucide-react";
import StatsPanel from "@/components/StatsPanel";
import MonitoringPanel from "@/components/admin/MonitoringPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { billingApi, formatSum, formatCard, getAccess, type BillingSettings, type Payment } from "@/lib/billing";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { api, auth, login, type AuthUser } from "@/lib/api";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

interface Stats {
  users: number;
  admins: number;
  blocked_users: number;
  organizers_with_bot: number;
  registrations: number;
  pending_payments: number;
  expired_users: number;
  premium_users: number;
  questions: number;
  recordings: number;
  storage_used_bytes: number;
}

type UserPatch = Partial<Pick<AuthUser, "email" | "username" | "first_name" | "last_name" | "role" | "blocked" | "storage_limit_bytes">> & { password?: string };

const GB = 1024 * 1024 * 1024;

/** Obuna holati belgisi (jadvalda) */
const AccessBadge: React.FC<{ u: AuthUser }> = ({ u }) => {
  const { t } = useTranslation();
  if (u.role === "developer") return <Badge variant="outline" className="text-muted-foreground">∞</Badge>;
  const a = getAccess(u);
  if (a.blocked) return <Badge variant="destructive">{t("admin_panel.acc_blocked")}</Badge>;
  if (a.expired) return <Badge className="bg-red-500 text-white hover:bg-red-500">{t("admin_panel.acc_expired")}</Badge>;
  return (
    <Badge className={cn("text-white", a.remind ? "bg-amber-500 hover:bg-amber-500" : "bg-emerald-500 hover:bg-emerald-500")}>
      {a.paid_until ? format(new Date(a.paid_until), "dd.MM.yyyy") : "—"} · {a.days_left}d
    </Badge>
  );
};

/** admin.edumock.uz — superadmin: foydalanuvchilar login/parolini boshqarish, tizim statistikasi */
const AdminLogin: React.FC = () => {
  const { t } = useTranslation();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(identity.trim(), password);
      if (u.role !== "developer") {
        auth.clear();
        showError(t("admin_panel.not_admin"));
        return;
      }
      showSuccess(t("common.success_logged_in"));
    } catch (err) {
      showError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-slate-950/80 border border-white/15 shadow-2xl p-8 space-y-5 text-white">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold mt-3">{t("admin_panel.title")}</h1>
          <p className="text-xs text-slate-400 mt-1">edumock.uz · superadmin</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adm-id" className="text-slate-300">{t("admin_panel.login")}</Label>
          <Input id="adm-id" autoFocus autoComplete="username" value={identity} onChange={(e) => setIdentity(e.target.value)} className="bg-slate-900 border-white/20 text-white" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adm-pw" className="text-slate-300">{t("common.password")}</Label>
          <Input id="adm-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-900 border-white/20 text-white" />
        </div>
        <Button type="submit" disabled={busy || !identity.trim() || !password} className="w-full h-11 font-bold bg-white text-slate-900 hover:bg-indigo-100">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t("common.login")}
        </Button>
      </form>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: number | string; cls?: string }> = ({ icon: Icon, label, value, cls }) => (
  <Card className={cn("border-2", cls)}>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-black leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </CardContent>
  </Card>
);

const EditUserDialog: React.FC<{ user: AuthUser | null; onClose: () => void; onSaved: (u: AuthUser) => void }> = ({ user, onClose, onSaved }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<UserPatch>({});
  const [busy, setBusy] = useState(false);
  const [paidUntil, setPaidUntil] = useState("");
  const [storageGb, setStorageGb] = useState("100");
  useEffect(() => {
    if (user) {
      setForm({ email: user.email, username: user.username, first_name: user.first_name, last_name: user.last_name, role: user.role, blocked: user.blocked, password: "" });
      setPaidUntil(user.paid_until ? user.paid_until.slice(0, 10) : "");
      setStorageGb(String(Math.round(user.storage_limit_bytes / GB)));
    }
  }, [user]);

  const addDays = async (n: number) => {
    if (!user) return;
    setBusy(true);
    try {
      const saved = await billingApi.setAccess(user.id, { add_days: n });
      onSaved(saved);
      setPaidUntil(saved.paid_until ? saved.paid_until.slice(0, 10) : "");
      showSuccess(t("admin_panel.saved"));
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };
  const set = <K extends keyof UserPatch>(k: K, v: UserPatch[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!user) return;
    const patch: UserPatch = {};
    (["email", "username", "first_name", "last_name", "role", "blocked"] as const).forEach((k) => {
      if (form[k] !== undefined && form[k] !== user[k]) (patch as Record<string, unknown>)[k] = form[k];
    });
    if (form.password) {
      if (form.password.length < 6) {
        showError(t("admin_panel.pw_short"));
        return;
      }
      patch.password = form.password;
    }
    const gb = Number(storageGb);
    if (Number.isFinite(gb) && gb >= 0 && Math.round(gb * GB) !== user.storage_limit_bytes) patch.storage_limit_bytes = Math.round(gb * GB);
    const newPaid = paidUntil ? new Date(`${paidUntil}T23:59:59`).toISOString() : null;
    const paidChanged = (user.paid_until ? user.paid_until.slice(0, 10) : "") !== paidUntil;
    if (!Object.keys(patch).length && !paidChanged) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      let saved = user;
      if (Object.keys(patch).length) saved = await api.patch<AuthUser>(`/api/admin/users/${user.id}`, patch);
      if (paidChanged) saved = await billingApi.setAccess(user.id, { paid_until: newPaid });
      onSaved(saved);
      showSuccess(t("admin_panel.saved"));
      onClose();
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md rounded-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" /> {user?.username}</DialogTitle>
          <DialogDescription>{t("admin_panel.edit_desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>{t("admin_panel.first_name")}</Label><Input value={form.first_name ?? ""} onChange={(e) => set("first_name", e.target.value)} /></div>
            <div className="space-y-1"><Label>{t("admin_panel.last_name")}</Label><Input value={form.last_name ?? ""} onChange={(e) => set("last_name", e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>{t("admin_panel.username")}</Label><Input value={form.username ?? ""} onChange={(e) => set("username", e.target.value)} className="font-mono" /></div>
          <div className="space-y-1"><Label>{t("common.email")}</Label><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
          <div className="space-y-1">
            <Label className="flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> {t("admin_panel.new_password")}</Label>
            <Input type="password" autoComplete="new-password" value={form.password ?? ""} onChange={(e) => set("password", e.target.value)} placeholder={t("admin_panel.new_password_hint")} />
          </div>
          {user?.role !== "developer" && (
            <div className="rounded-md border p-3 space-y-2 bg-muted/20">
              <Label className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> {t("admin_panel.paid_until")}</Label>
              <div className="flex gap-2">
                <Input type="date" value={paidUntil} onChange={(e) => setPaidUntil(e.target.value)} className="flex-1" />
                <Button type="button" size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => addDays(30)} title="+30">
                  <CalendarPlus className="h-4 w-4" /> +30
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("admin_panel.paid_until_hint")}</p>
            </div>
          )}
          <div className="space-y-1">
            <Label>{t("admin_panel.storage_gb")}</Label>
            <Input type="number" min={0} value={storageGb} onChange={(e) => setStorageGb(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>{t("admin_panel.is_admin")}</Label>
            <Switch checked={form.role === "developer"} onCheckedChange={(v) => set("role", v ? "developer" : "user")} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label className="text-destructive">{t("admin_panel.blocked")}</Label>
            <Switch checked={!!form.blocked} onCheckedChange={(v) => set("blocked", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>{t("registrations_page.cancel")}</Button>
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("registrations_page.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PaymentsTab: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [onlyPending, setOnlyPending] = useState(true);
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [note, setNote] = useState("");
  const q = useQuery({ queryKey: ["admin-payments", onlyPending], queryFn: () => billingApi.adminPayments(onlyPending ? "pending" : undefined), refetchInterval: 20_000 });
  const review = useMutation({
    mutationFn: ({ id, status, admin_note }: { id: string; status: "approved" | "rejected"; admin_note?: string }) => billingApi.review(id, status, admin_note),
    onSuccess: (_d, v) => {
      showSuccess(v.status === "approved" ? t("admin_panel.pay_approved") : t("admin_panel.pay_rejected"));
      setRejecting(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => showError(e.message),
  });
  const items = q.data ?? [];
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg flex-1">{t("admin_panel.payments")}</h2>
          <Button size="sm" variant={onlyPending ? "default" : "outline"} onClick={() => setOnlyPending(true)}>{t("admin_panel.pay_pending")}</Button>
          <Button size="sm" variant={!onlyPending ? "default" : "outline"} onClick={() => setOnlyPending(false)}>{t("admin_panel.pay_all")}</Button>
        </div>
        {q.isLoading ? (
          <p className="text-muted-foreground py-6 text-center">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">{t("admin_panel.pay_empty")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((p) => {
              const url = api.fileUrl(p.receipt_url);
              const isPdf = url.toLowerCase().endsWith(".pdf");
              return (
                <div key={p.id} className={cn("rounded-xl border p-3 flex gap-3", p.status === "pending" ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20" : p.status === "approved" ? "border-emerald-300/60" : "border-red-300/60 opacity-80")}>
                  <a href={url} target="_blank" rel="noreferrer" className="shrink-0" title={t("admin_panel.pay_receipt")}>
                    {isPdf ? <span className="h-24 w-20 rounded-md border bg-muted flex items-center justify-center text-xs font-bold">PDF</span> : <img src={url} alt="receipt" className="h-24 w-20 rounded-md border object-cover hover:scale-105 transition-transform" />}
                  </a>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-semibold truncate">{p.user?.name || p.user?.username} <span className="text-xs text-muted-foreground">@{p.user?.username}</span></div>
                    <div className="text-xs text-muted-foreground truncate">{p.user?.email}</div>
                    <div className="text-lg font-black">{formatSum(p.amount)} <span className="text-xs font-semibold text-muted-foreground">{t("billing.sum")}</span></div>
                    <div className="text-xs text-muted-foreground">{format(new Date(p.created), "dd.MM.yyyy HH:mm")}{p.user?.paid_until ? ` · ${t("admin_panel.paid_until")}: ${format(new Date(p.user.paid_until), "dd.MM.yyyy")}` : ""}</div>
                    {p.note && <div className="text-xs italic text-muted-foreground">💬 {p.note}</div>}
                    {p.status === "pending" ? (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" disabled={review.isPending} onClick={() => review.mutate({ id: p.id, status: "approved" })}>
                          <Check className="h-4 w-4" /> {t("admin_panel.pay_approve")}
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1" disabled={review.isPending} onClick={() => setRejecting(p)}>
                          <X className="h-4 w-4" /> {t("admin_panel.pay_reject")}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs pt-1">
                        <Badge variant="outline" className={p.status === "approved" ? "border-emerald-400 text-emerald-600" : "border-red-400 text-red-600"}>{t(`billing.st_${p.status}`)}</Badge>
                        {p.paid_until_after && <span className="ml-2 text-muted-foreground">→ {format(new Date(p.paid_until_after), "dd.MM.yyyy")}</span>}
                        {p.admin_note && <span className="ml-2 text-muted-foreground">{p.admin_note}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && !review.isPending && setRejecting(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>{t("admin_panel.pay_reject")} — {rejecting?.user?.name || rejecting?.user?.username}</DialogTitle>
            <DialogDescription>{t("admin_panel.pay_reject_desc")}</DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder={t("admin_panel.pay_reject_note")} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={review.isPending}>{t("registrations_page.cancel")}</Button>
            <Button variant="destructive" disabled={review.isPending} onClick={() => rejecting && review.mutate({ id: rejecting.id, status: "rejected", admin_note: note.trim() })}>
              {t("admin_panel.pay_reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const BillingSettingsTab: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-billing-settings"], queryFn: billingApi.adminSettings });
  const [form, setForm] = useState<Partial<BillingSettings>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data) setForm({ amount: q.data.amount, card_number: q.data.card_number, card_holder: q.data.card_holder, period_days: q.data.period_days, remind_days: q.data.remind_days, note: q.data.note });
  }, [q.data]);
  const set = <K extends keyof BillingSettings>(k: K, v: BillingSettings[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      const saved = await billingApi.saveAdminSettings({ ...form, card_number: (form.card_number || "").replace(/\s/g, "") });
      qc.setQueryData(["admin-billing-settings"], saved);
      showSuccess(t("admin_panel.saved"));
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardContent className="p-4 space-y-4 max-w-2xl">
        <div>
          <h2 className="font-bold text-lg">{t("admin_panel.billing_settings")}</h2>
          <p className="text-xs text-muted-foreground">{t("admin_panel.billing_settings_hint")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1"><Label>{t("admin_panel.b_amount")}</Label><Input type="number" min={0} step={1000} value={form.amount ?? 0} onChange={(e) => set("amount", Number(e.target.value))} /></div>
          <div className="space-y-1"><Label>{t("admin_panel.b_period")}</Label><Input type="number" min={1} value={form.period_days ?? 30} onChange={(e) => set("period_days", Number(e.target.value))} /></div>
          <div className="space-y-1"><Label>{t("admin_panel.b_remind")}</Label><Input type="number" min={0} value={form.remind_days ?? 5} onChange={(e) => set("remind_days", Number(e.target.value))} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>{t("registrations_page.s_card_number")}</Label><Input inputMode="numeric" value={formatCard(form.card_number ?? "")} onChange={(e) => set("card_number", e.target.value.replace(/\D/g, "").slice(0, 16))} className="font-mono" placeholder="8600 0000 0000 0000" /></div>
          <div className="space-y-1"><Label>{t("registrations_page.s_card_holder")}</Label><Input value={form.card_holder ?? ""} onChange={(e) => set("card_holder", e.target.value)} /></div>
        </div>
        <div className="space-y-1"><Label>{t("admin_panel.b_note")}</Label><Textarea value={form.note ?? ""} onChange={(e) => set("note", e.target.value)} rows={2} maxLength={500} placeholder={t("admin_panel.b_note_ph")} /></div>
        <div className="flex justify-end"><Button onClick={save} disabled={busy} className="min-w-[140px]">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("registrations_page.save")}</Button></div>
      </CardContent>
    </Card>
  );
};

const AdminPanel: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [tab, setTab] = useState<"users" | "monitoring" | "payments" | "billing" | "stats">("users");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const isAdmin = user?.role === "developer";
  const statsQ = useQuery({ queryKey: ["admin-stats"], queryFn: () => api.get<Stats>("/api/admin/stats"), enabled: isAdmin, refetchInterval: 30_000 });
  const presenceQ = useQuery({ queryKey: ["admin-presence"], queryFn: () => api.get<{ online: number }>("/api/admin/presence"), enabled: isAdmin, refetchInterval: 15_000 });
  const usersQ = useQuery({
    queryKey: ["admin-users", debounced],
    queryFn: () => api.get<{ items: AuthUser[]; totalItems: number }>(`/api/admin/users?perPage=200${debounced ? `&search=${encodeURIComponent(debounced)}` : ""}`),
    enabled: isAdmin,
  });
  const toggleBlock = useMutation({
    mutationFn: (u: AuthUser) => api.patch<AuthUser>(`/api/admin/users/${u.id}`, { blocked: !u.blocked }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: Error) => showError(e.message),
  });

  const items = useMemo(() => usersQ.data?.items ?? [], [usersQ.data]);

  if (!user || !isAdmin) return <AdminLogin />;

  const logout = () => {
    auth.clear();
    navigate("/");
  };

  const onSaved = (u: AuthUser) => {
    qc.setQueryData<{ items: AuthUser[]; totalItems: number }>(["admin-users", debounced], (old) => (old ? { ...old, items: old.items.map((x) => (x.id === u.id ? u : x)) } : old));
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    if (u.id === user.id) auth.save(auth.token, u);
  };

  const s = statsQ.data;
  const p = presenceQ.data;
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-indigo-300" /> {t("admin_panel.title")}</div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-300 hidden sm:inline">@{user.username}</span>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={logout}><LogOut className="h-4 w-4 mr-1" /> {t("common.logout")}</Button>
        </div>
      </header>
      <main className="container mx-auto p-4 space-y-5 max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
          <StatCard icon={Users} label={t("admin_panel.st_users")} value={s?.users ?? "…"} />
          <StatCard icon={ShieldCheck} label={t("admin_panel.st_admins")} value={s?.admins ?? "…"} cls="border-indigo-400" />
          <StatCard icon={Bot} label={t("admin_panel.st_bots")} value={s?.organizers_with_bot ?? "…"} />
          <StatCard icon={ClipboardList} label={t("admin_panel.st_registrations")} value={s?.registrations ?? "…"} />
          <StatCard icon={Receipt} label={t("admin_panel.st_payments")} value={s?.pending_payments ?? "…"} cls={s?.pending_payments ? "border-amber-400" : undefined} />
          <StatCard icon={Clock} label={t("admin_panel.st_expired")} value={s?.expired_users ?? "…"} cls={s?.expired_users ? "border-red-400" : undefined} />
          <StatCard icon={Ban} label={t("admin_panel.st_blocked")} value={s?.blocked_users ?? "…"} cls={s?.blocked_users ? "border-red-400" : undefined} />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="h-11 p-1">
            <TabsTrigger value="users" className="gap-1.5 px-4 h-9"><Users className="h-4 w-4" /> {t("admin_panel.users")}</TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-1.5 px-4 h-9">
              <Activity className="h-4 w-4" /> {t("monitoring.tab")}
              {p?.online ? <span className="ml-1 rounded-full bg-emerald-500 text-white px-1.5 text-[10px]">{p.online}</span> : null}
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5 px-4 h-9">
              <Receipt className="h-4 w-4" /> {t("admin_panel.payments")}
              {s?.pending_payments ? <span className="ml-1 rounded-full bg-amber-500 text-white px-1.5 text-[10px]">{s.pending_payments}</span> : null}
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5 px-4 h-9"><CreditCard className="h-4 w-4" /> {t("admin_panel.billing_settings")}</TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5 px-4 h-9"><BarChart3 className="h-4 w-4" /> {t("stats.tab")}</TabsTrigger>
          </TabsList>
          <TabsContent value="monitoring" className="mt-4"><MonitoringPanel /></TabsContent>
          <TabsContent value="stats" className="mt-4"><StatsPanel mode="admin" title={`edumock.uz — ${t("stats.report_title")}`} /></TabsContent>
          <TabsContent value="payments" className="mt-4"><PaymentsTab /></TabsContent>
          <TabsContent value="billing" className="mt-4"><BillingSettingsTab /></TabsContent>
          <TabsContent value="users" className="mt-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="font-bold text-lg flex-1">{t("admin_panel.users")} <span className="text-muted-foreground font-normal text-sm">({usersQ.data?.totalItems ?? 0})</span></h2>
              <div className="relative sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin_panel.search")} className="pl-9" />
              </div>
            </div>
            {usersQ.isLoading ? (
              <p className="text-muted-foreground py-6 text-center">{t("common.loading")}</p>
            ) : isMobile ? (
              <div className="space-y-2">
                {items.map((u) => (
                  <div key={u.id} className={cn("rounded-lg border p-3", u.blocked && "border-red-300 bg-red-50/40 dark:bg-red-950/20")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.username}</div>
                        <div className="text-xs text-muted-foreground truncate">@{u.username} · {u.email}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {u.role === "developer" && <Badge className="bg-indigo-500 text-white">admin</Badge>}
                        <AccessBadge u={u} />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(u)}><Pencil className="h-3.5 w-3.5" /> {t("admin_panel.edit")}</Button>
                      <Button size="sm" variant={u.blocked ? "default" : "destructive"} disabled={toggleBlock.isPending || u.id === user.id} onClick={() => toggleBlock.mutate(u)}>
                        {u.blocked ? t("admin_panel.unblock") : t("admin_panel.block")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin_panel.username")}</TableHead>
                      <TableHead>{t("common.email")}</TableHead>
                      <TableHead>{t("admin_panel.name")}</TableHead>
                      <TableHead>{t("admin_panel.role")}</TableHead>
                      <TableHead>{t("admin_panel.created")}</TableHead>
                      <TableHead className="text-right">{t("registrations_page.col_actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((u) => (
                      <TableRow key={u.id} className={cn(u.blocked && "bg-red-50/50 dark:bg-red-950/20")}>
                        <TableCell className="font-mono">@{u.username}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{`${u.first_name} ${u.last_name}`.trim() || "—"}</TableCell>
                        <TableCell>
                          {u.role === "developer" ? <Badge className="bg-indigo-500 text-white">admin</Badge> : <Badge variant="outline">user</Badge>}
                          {u.blocked && <Badge variant="destructive" className="ml-1">blocked</Badge>}
                          <span className="ml-1 inline-block"><AccessBadge u={u} /></span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(u.created), "dd.MM.yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(u)}><Pencil className="h-3.5 w-3.5" /> {t("admin_panel.edit")}</Button>
                            <Button size="sm" variant={u.blocked ? "default" : "destructive"} disabled={toggleBlock.isPending || u.id === user.id} onClick={() => toggleBlock.mutate(u)}>
                              {u.blocked ? t("admin_panel.unblock") : t("admin_panel.block")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </main>
      <EditUserDialog user={editing} onClose={() => setEditing(null)} onSaved={onSaved} />
    </div>
  );
};

export default AdminPanel;

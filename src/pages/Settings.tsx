"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  CreditCard,
  ClipboardList,
  Upload,
  XCircle,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  Moon,
  MonitorPlay,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  Trash2,
  Unplug,
  User,
  UserPlus,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import CopyButton from "@/components/CopyButton";
import PaymentQr from "@/components/PaymentQr";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { showError, showSuccess } from "@/utils/toast";
import { formatCard, registrationsApi, type RegistrationSettings, type SettingsPatch } from "@/lib/registrations";
import { billingApi, formatSum, type Payment } from "@/lib/billing";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ================================================================ bo'limlar ro'yxati

type SectionKey = "general" | "billing" | "bot" | "registration" | "admin" | "station" | "tickets";

const SECTIONS: { key: SectionKey; icon: React.ElementType; needsAuth: boolean }[] = [
  { key: "general", icon: SettingsIcon, needsAuth: false },
  { key: "billing", icon: CreditCard, needsAuth: true },
  { key: "bot", icon: Bot, needsAuth: true },
  { key: "registration", icon: ClipboardList, needsAuth: true },
  { key: "admin", icon: ShieldCheck, needsAuth: true },
  { key: "station", icon: MonitorPlay, needsAuth: true },
  { key: "tickets", icon: FileText, needsAuth: true },
];

/** Bo'lim sarlavhasi */
const SectionHeader: React.FC<{ icon: React.ElementType; title: string; desc: string; right?: React.ReactNode }> = ({ icon: Icon, title, desc, right }) => (
  <CardHeader className="pb-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="mt-1">{desc}</CardDescription>
        </div>
      </div>
      {right}
    </div>
  </CardHeader>
);

/** Sozlamalar formasi (registration_settings) — bo'limlar bo'ylab umumiy holat */
function useSettingsForm(settings: RegistrationSettings | undefined) {
  const qc = useQueryClient();
  const [form, setForm] = useState<SettingsPatch>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings && !dirty) {
      setForm({
        enabled: settings.enabled,
        free_mode: settings.free_mode,
        center_name: settings.center_name,
        exam_price: settings.exam_price,
        card_number: settings.card_number,
        card_holder: settings.card_holder,
        exam_info: settings.exam_info,
        contact_info: settings.contact_info,
        receipt_minutes: settings.receipt_minutes,
        video_retention_days: settings.video_retention_days,
        ticket_footer: settings.ticket_footer,
        ticket_qr_url: settings.ticket_qr_url,
        station_enabled: settings.station_enabled,
      });
    }
  }, [settings, dirty]);

  const set = <K extends keyof SettingsPatch>(k: K, v: SettingsPatch[K]) => {
    setDirty(true);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const apply = (s: RegistrationSettings) => qc.setQueryData(["registration-settings"], s);

  const save = async (successMsg: string) => {
    setSaving(true);
    try {
      const saved = await registrationsApi.saveSettings({ ...form, card_number: (form.card_number || "").replace(/\s/g, "") });
      apply(saved);
      setDirty(false);
      showSuccess(successMsg);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return { form, set, save, saving, dirty, apply };
}

type FormApi = ReturnType<typeof useSettingsForm>;

// ================================================================ Umumiy

const GeneralSection: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <Card>
      <SectionHeader icon={SettingsIcon} title={t("settings_page.sec_general")} desc={t("settings_page.sec_general_desc")} />
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="h-5 w-5 text-indigo-400" /> : <Sun className="h-5 w-5 text-amber-500" />}
            <div>
              <Label htmlFor="dark-mode" className="text-base">{t("settings_page.dark_mode")}</Label>
              <p className="text-xs text-muted-foreground">{t("settings_page.dark_mode_hint")}</p>
            </div>
          </div>
          <Switch id="dark-mode" checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-base">{t("settings_page.language")}</Label>
            <p className="text-xs text-muted-foreground">{t("settings_page.language_hint")}</p>
          </div>
          <div className="rounded-md bg-primary text-white"><LanguageSwitcher /></div>
        </div>
        {user && (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base">{t("common.profile")}</Label>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/user-profile">{t("settings_page.open_profile")}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ================================================================ To'lov (billing)

const PAYMENT_STATUS_STYLE: Record<Payment["status"], string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-200",
};

const BillingSection: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const infoQ = useQuery({ queryKey: ["billing-info"], queryFn: billingApi.info, refetchInterval: 30_000 });
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const info = infoQ.data;
  const access = info?.access;
  const st = info?.settings;

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    try {
      await billingApi.submit(file, note.trim(), (l, tot) => setProgress(tot ? Math.round((l / tot) * 100) : 0));
      showSuccess(t("billing.sent"));
      setFile(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["billing-info"] });
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const statusCard = () => {
    if (!access) return null;
    if (access.blocked)
      return (
        <div className="rounded-2xl border-2 border-red-400 bg-red-50 dark:bg-red-950/30 p-4 flex items-center gap-3">
          <XCircle className="h-8 w-8 text-red-500 shrink-0" />
          <div>
            <div className="font-bold text-red-700 dark:text-red-300">{t("billing.status_blocked")}</div>
            <div className="text-xs text-muted-foreground">{t("billing.status_blocked_hint")}</div>
          </div>
        </div>
      );
    if (access.expired)
      return (
        <div className="rounded-2xl border-2 border-red-400 bg-red-50 dark:bg-red-950/30 p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-red-500 shrink-0" />
          <div>
            <div className="font-bold text-red-700 dark:text-red-300">{t("billing.status_expired")}</div>
            <div className="text-xs text-muted-foreground">{access.paid_until ? t("billing.expired_on", { date: format(new Date(access.paid_until), "dd.MM.yyyy") }) : t("billing.never_paid")}</div>
          </div>
        </div>
      );
    const warn = !!access.remind;
    return (
      <div className={cn("rounded-2xl border-2 p-4 flex items-center gap-3", warn ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30")}>
        <CheckCircle2 className={cn("h-8 w-8 shrink-0", warn ? "text-amber-500" : "text-emerald-500")} />
        <div>
          <div className={cn("font-bold", warn ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300")}>
            {t("billing.status_active_until", { date: access.paid_until ? format(new Date(access.paid_until), "dd.MM.yyyy") : "—" })}
          </div>
          <div className="text-xs text-muted-foreground">{t("billing.days_left", { n: access.days_left ?? 0 })}</div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <SectionHeader icon={CreditCard} title={t("billing.title")} desc={t("billing.desc")} />
      <CardContent className="space-y-5">
        {statusCard()}

        {/* Rekvizitlar */}
        <div className="rounded-2xl border bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-5 shadow-lg">
          <div className="text-xs uppercase tracking-[0.2em] text-white/70">{t("billing.plan_price")}</div>
          <div className="text-3xl font-black mt-1">{st ? formatSum(st.amount) : "…"} <span className="text-base font-semibold text-white/80">{t("billing.sum")}</span> <span className="text-sm font-medium text-white/70">/ {st?.period_days ?? 30} {t("billing.days")}</span></div>
          {/* QR havolasi bo'lsa — QR bilan to'lov (karta raqami va egasining ismi ko'rsatilmaydi) */}
          {st?.qr_url ? (
            <PaymentQr url={st.qr_url} className="mt-4" />
          ) : st?.card_number ? (
            <div className="mt-4 rounded-xl bg-white/10 backdrop-blur px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-lg sm:text-xl tracking-widest">{formatCard(st.card_number)}</div>
                {st.card_holder && <div className="text-sm text-white/80">{st.card_holder}</div>}
              </div>
              <CopyButton text={st.card_number} label={t("registrations_page.copy")} copiedLabel={t("registrations_page.copied")} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/80">{t("billing.no_requisites")}</p>
          )}
          {st?.note && <p className="mt-3 text-sm text-white/85">{st.note}</p>}
        </div>

        {/* Chek yuborish */}
        {info?.pending ? (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200"><Clock className="h-4 w-4" /> {t("billing.pending_title")}</div>
            <p className="text-xs text-muted-foreground">{t("billing.pending_desc", { date: format(new Date(info.pending.created), "dd.MM.yyyy HH:mm") })}</p>
            <a href={api.fileUrl(info.pending.receipt_url)} target="_blank" rel="noreferrer" className="inline-block">
              {info.pending.receipt_url.toLowerCase().endsWith(".pdf") ? <span className="text-xs underline">PDF</span> : <img src={api.fileUrl(info.pending.receipt_url)} alt="receipt" className="h-24 rounded-md border object-cover" />}
            </a>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed p-4 space-y-3">
            <div className="font-semibold flex items-center gap-2"><Upload className="h-4 w-4 text-primary" /> {t("billing.upload_title")}</div>
            <p className="text-xs text-muted-foreground">{t("billing.upload_hint")}</p>
            <label className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-colors hover:bg-muted/50", file && "border-primary bg-primary/5")}>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {preview ? <img src={preview} alt="preview" className="max-h-48 rounded-md object-contain" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
              <span className="text-sm font-medium">{file ? file.name : t("billing.choose_file")}</span>
            </label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder={t("billing.note_placeholder")} />
            {busy && <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>}
            <Button onClick={submit} disabled={!file || busy} className="w-full h-11 font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 text-white">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("billing.send")}
            </Button>
          </div>
        )}

        {/* Tarix */}
        {info && info.history.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">{t("billing.history")}</div>
            <ul className="divide-y rounded-xl border">
              {info.history.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(p.created), "dd.MM.yyyy")}</span>
                  <span className="font-semibold">{formatSum(p.amount)} {t("billing.sum")}</span>
                  <Badge variant="outline" className={cn("ml-auto", PAYMENT_STATUS_STYLE[p.status])}>{t(`billing.st_${p.status}`)}</Badge>
                  {p.status === "approved" && p.paid_until_after && <span className="text-xs text-muted-foreground">→ {format(new Date(p.paid_until_after), "dd.MM.yyyy")}</span>}
                  {p.status === "rejected" && p.admin_note && <span className="text-xs text-red-500">{p.admin_note}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ================================================================ Telegram bot

const BotSection: React.FC<{ settings: RegistrationSettings | undefined; f: FormApi }> = ({ settings, f }) => {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const connect = async () => {
    const tok = token.trim();
    if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(tok)) {
      showError(t("registrations_page.bot_token_invalid"));
      return;
    }
    setBusy(true);
    try {
      const saved = await registrationsApi.setBotToken(tok);
      f.apply(saved);
      setToken("");
      showSuccess(`${t("registrations_page.bot_connected")}: @${saved.bot_username}`);
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      f.apply(await registrationsApi.clearBotToken());
      setRemoveOpen(false);
      showSuccess(t("registrations_page.bot_removed"));
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const connected = !!settings?.bot_token_set;
  return (
    <Card className={cn(!connected && "border-amber-300/70 dark:border-amber-700/60")}>
      <SectionHeader
        icon={Bot}
        title={t("registrations_page.bot_section")}
        desc={t("registrations_page.bot_section_hint")}
        right={
          connected ? (
            <Badge className={cn("text-white whitespace-nowrap", settings?.bot_running ? "bg-emerald-500 hover:bg-emerald-500" : "bg-red-500 hover:bg-red-500")}>
              @{settings?.bot_username} · {settings?.bot_running ? t("registrations_page.bot_running") : t("registrations_page.bot_stopped")}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 whitespace-nowrap">{t("registrations_page.bot_not_set")}</Badge>
          )
        }
      />
      <CardContent className="space-y-4">
        {connected && settings?.bot_link && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("registrations_page.bot_link_title")}</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <code className="block flex-1 min-w-0 truncate rounded-md bg-background border px-3 py-2 text-sm font-mono select-all">{settings.bot_link}</code>
              <div className="flex gap-2">
                <CopyButton text={settings.bot_link} label={t("registrations_page.copy")} copiedLabel={t("registrations_page.copied")} />
                <Button size="sm" variant="secondary" className="gap-1" asChild>
                  <a href={settings.bot_link} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {t("registrations_page.open_telegram")}
                  </a>
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("registrations_page.bot_link_hint")}</p>
          </div>
        )}
        {!connected && (
          <ol className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground list-decimal pl-8 space-y-1">
            <li>{t("registrations_page.bot_step1")}</li>
            <li>{t("registrations_page.bot_step2")}</li>
            <li>{t("registrations_page.bot_step3")}</li>
          </ol>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="bot-token">{connected ? t("registrations_page.bot_token_change") : "BotFather token"}</Label>
          <div className="flex gap-2">
            <Input id="bot-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="123456789:AAH..." className="flex-1 font-mono" />
            <Button disabled={busy || !token.trim()} onClick={connect}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("registrations_page.bot_connect")}
            </Button>
            {connected && (
              <Button variant="ghost" className="text-destructive" disabled={busy} onClick={() => setRemoveOpen(true)} title={t("registrations_page.bot_remove")}>
                <Unplug className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      <AlertDialog open={removeOpen} onOpenChange={(o) => !o && !busy && setRemoveOpen(false)}>
        <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("registrations_page.bot_remove")}</AlertDialogTitle>
            <AlertDialogDescription>{t("registrations_page.bot_remove_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("registrations_page.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={busy} onClick={(e) => { e.preventDefault(); void remove(); }}>
              {t("registrations_page.bot_remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

// ================================================================ Ro'yxatdan o'tish

const RegistrationSection: React.FC<{ f: FormApi }> = ({ f }) => {
  const { t } = useTranslation();
  const { form, set } = f;
  return (
    <Card>
      <SectionHeader
        icon={ClipboardList}
        title={t("settings_page.sec_registration")}
        desc={t("registrations_page.settings_desc")}
        right={<Switch checked={!!form.enabled} onCheckedChange={(v) => set("enabled", v)} aria-label={t("registrations_page.s_enabled")} />}
      />
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="s-center">{t("registrations_page.s_center_name")}</Label>
          <Input id="s-center" value={form.center_name ?? ""} onChange={(e) => set("center_name", e.target.value)} maxLength={120} placeholder="Younine Academy" />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3 gap-3">
          <div>
            <Label htmlFor="s-free" className="font-medium">🎁 {t("registrations_page.s_free_mode")}</Label>
            <p className="text-xs text-muted-foreground mt-1">{t("registrations_page.s_free_mode_hint")}</p>
          </div>
          <Switch id="s-free" checked={!!form.free_mode} onCheckedChange={(v) => set("free_mode", v)} />
        </div>
        {!form.free_mode && (
          <div className="rounded-md border p-3 space-y-3 bg-muted/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-price">{t("registrations_page.s_exam_price")}</Label>
                <Input id="s-price" type="number" min={0} step={1000} value={form.exam_price ?? 0} onChange={(e) => set("exam_price", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-minutes">{t("registrations_page.s_receipt_minutes")}</Label>
                <Input id="s-minutes" type="number" min={0} max={1440} value={form.receipt_minutes ?? 10} onChange={(e) => set("receipt_minutes", Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">{t("registrations_page.s_receipt_minutes_hint")}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-card">{t("registrations_page.s_card_number")}</Label>
                <Input id="s-card" inputMode="numeric" value={formatCard(form.card_number ?? "")} onChange={(e) => set("card_number", e.target.value.replace(/\D/g, "").slice(0, 16))} placeholder="8600 0000 0000 0000" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-holder">{t("registrations_page.s_card_holder")}</Label>
                <Input id="s-holder" value={form.card_holder ?? ""} onChange={(e) => set("card_holder", e.target.value)} maxLength={120} />
              </div>
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="s-info">{t("registrations_page.s_exam_info")}</Label>
          <Textarea id="s-info" value={form.exam_info ?? ""} onChange={(e) => set("exam_info", e.target.value)} maxLength={500} rows={2} placeholder="20.09.2026, 10:00 — Toshkent, Chilonzor..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-contact">{t("registrations_page.s_contact_info")}</Label>
          <Input id="s-contact" value={form.contact_info ?? ""} onChange={(e) => set("contact_info", e.target.value)} maxLength={200} placeholder="+998 90 123 45 67, @admin" />
        </div>
        <SaveBar f={f} />
      </CardContent>
    </Card>
  );
};

const SaveBar: React.FC<{ f: FormApi }> = ({ f }) => {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end pt-2">
      <Button onClick={() => f.save(t("registrations_page.settings_saved"))} disabled={f.saving || !f.dirty} className="min-w-[140px]">
        {f.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("registrations_page.save")}
      </Button>
    </div>
  );
};

// ================================================================ Admin panel

const AdminSection: React.FC<{ settings: RegistrationSettings | undefined; f: FormApi }> = ({ settings, f }) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [removeAdmin, setRemoveAdmin] = useState<{ id: string; title: string } | null>(null);

  const run = async (fn: () => Promise<RegistrationSettings>, okMsg?: string) => {
    setBusy(true);
    try {
      f.apply(await fn());
      if (okMsg) showSuccess(okMsg);
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <SectionHeader
        icon={ShieldCheck}
        title={t("registrations_page.admin_panel")}
        desc={t("registrations_page.admin_panel_hint")}
        right={
          <Badge variant="outline" className={cn("whitespace-nowrap", settings?.admins.length ? "border-emerald-400 text-emerald-600 dark:text-emerald-300" : "text-muted-foreground")}>
            {t("registrations_page.admins")}: {settings?.admins.length ?? 0}
          </Badge>
        }
      />
      <CardContent className="space-y-4">
        {!settings?.bot_token_set && <p className="text-sm rounded-md border border-amber-300/70 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2">🤖 {t("settings_page.bot_required")}</p>}

        {settings?.admins.length ? (
          <ul className="divide-y rounded-md border">
            {settings.admins.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{a.title || a.username || a.chat_id}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {a.username ? `@${a.username} · ` : ""}
                    {format(new Date(a.added_at), "dd.MM.yyyy HH:mm")}
                  </span>
                </span>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" disabled={busy} onClick={() => setRemoveAdmin({ id: a.id, title: a.title || a.username || String(a.chat_id) })} title={t("registrations_page.admin_remove")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">{t("registrations_page.admin_none")}</p>
        )}

        {settings?.admin_invite ? (
          <div className="rounded-md border border-amber-300/70 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-amber-700 dark:text-amber-300">🔗 {t("registrations_page.admin_invite_active")}</span>
              <span className="text-xs text-muted-foreground">{t("registrations_page.admin_invite_expires", { time: format(new Date(settings.admin_invite.expires_at), "dd.MM HH:mm") })}</span>
            </div>
            <code className="block w-full min-w-0 truncate rounded-md bg-background border px-3 py-2 text-sm font-mono select-all" title={settings.admin_invite.link}>{settings.admin_invite.link || "…"}</code>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={settings.admin_invite.link} label={t("registrations_page.copy")} copiedLabel={t("registrations_page.copied")} />
              <Button size="sm" variant="secondary" className="gap-1" asChild disabled={!settings.admin_invite.link}>
                <a href={settings.admin_invite.link || "#"} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {t("registrations_page.open_telegram")}
                </a>
              </Button>
              <Button size="sm" variant="ghost" className="gap-1 text-destructive ml-auto" disabled={busy} onClick={() => run(registrationsApi.revokeAdminInvite, t("registrations_page.admin_invite_revoked"))}>
                <X className="h-4 w-4" />
                {t("registrations_page.admin_invite_revoke")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("registrations_page.admin_invite_hint")}</p>
          </div>
        ) : (
          <Button variant="outline" className="gap-2 w-full" disabled={busy || !settings?.bot_token_set} onClick={() => run(registrationsApi.createAdminInvite)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {t("registrations_page.admin_invite_new")}
          </Button>
        )}

        <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border p-3">
          <div>
            <Label htmlFor="s-retention" className="text-sm">{t("registrations_page.s_retention")}</Label>
            <p className="text-xs text-muted-foreground">{t("registrations_page.s_retention_hint")}</p>
          </div>
          <Input id="s-retention" type="number" min={0} max={3650} className="w-24" value={f.form.video_retention_days ?? 15} onChange={(e) => f.set("video_retention_days", Number(e.target.value))} />
        </div>
        <SaveBar f={f} />
      </CardContent>
      <AlertDialog open={!!removeAdmin} onOpenChange={(o) => !o && !busy && setRemoveAdmin(null)}>
        <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("registrations_page.admin_remove")}</AlertDialogTitle>
            <AlertDialogDescription>{removeAdmin?.title} — {t("registrations_page.admin_remove_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("registrations_page.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (removeAdmin) void run(() => registrationsApi.removeAdmin(removeAdmin.id), t("registrations_page.admin_removed")).then(() => setRemoveAdmin(null));
              }}
            >
              {t("registrations_page.admin_remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

// ================================================================ Imtihon stansiyasi

const StationSection: React.FC<{ settings: RegistrationSettings | undefined; f: FormApi }> = ({ settings, f }) => {
  const { t } = useTranslation();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const savePw = async () => {
    if (pw.length < 6) {
      showError(t("registrations_page.station_pw_short"));
      return;
    }
    setBusy(true);
    try {
      f.apply(await registrationsApi.setStationPassword(pw));
      setPw("");
      showSuccess(t("registrations_page.station_pw_saved"));
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <SectionHeader
        icon={MonitorPlay}
        title={t("registrations_page.station_section")}
        desc={t("registrations_page.station_hint")}
        right={<Switch checked={!!f.form.station_enabled} onCheckedChange={(v) => f.set("station_enabled", v)} aria-label="enabled" />}
      />
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <code className="block flex-1 min-w-0 truncate rounded-md bg-muted px-3 py-2 text-sm font-mono select-all">{settings?.station_url || "…"}</code>
          <div className="flex gap-2">
            <CopyButton text={settings?.station_url || ""} label={t("registrations_page.copy")} copiedLabel={t("registrations_page.copied")} />
            <Button size="sm" variant="secondary" className="gap-1" asChild disabled={!settings?.station_url}>
              <a href={settings?.station_url || "#"} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            {settings?.station_password_set ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white">{t("registrations_page.station_pw_set")}</Badge>
            ) : (
              <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-300">{t("registrations_page.station_pw_not_set")}</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={settings?.station_password_set ? t("registrations_page.station_pw_change") : t("registrations_page.station_pw_new")} maxLength={100} className="flex-1" />
            <Button disabled={busy || pw.length < 6} onClick={savePw}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("registrations_page.save")}
            </Button>
          </div>
        </div>
        <SaveBar f={f} />
      </CardContent>
    </Card>
  );
};

// ================================================================ Chiptalar

const TicketsSection: React.FC<{ settings: RegistrationSettings | undefined; f: FormApi }> = ({ settings, f }) => {
  const { t } = useTranslation();
  return (
    <Card>
      <SectionHeader icon={FileText} title={t("registrations_page.tickets_section")} desc={t("registrations_page.tickets_section_hint")} />
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="s-tfooter">{t("registrations_page.s_ticket_footer")}</Label>
          <Input id="s-tfooter" value={f.form.ticket_footer ?? ""} onChange={(e) => f.set("ticket_footer", e.target.value)} maxLength={60} placeholder={settings?.center_name || "@cefrcentreuz"} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-tqr">{t("registrations_page.s_ticket_qr")}</Label>
          <Input id="s-tqr" value={f.form.ticket_qr_url ?? ""} onChange={(e) => f.set("ticket_qr_url", e.target.value)} maxLength={300} placeholder={settings?.bot_link || "https://t.me/..."} />
          <p className="text-xs text-muted-foreground">{t("registrations_page.s_ticket_qr_hint")}</p>
        </div>
        <SaveBar f={f} />
      </CardContent>
    </Card>
  );
};

// ================================================================ sahifa

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [params, setParams] = useSearchParams();

  const visible = useMemo(() => SECTIONS.filter((s) => (!s.needsAuth || !!user) && !(s.key === "billing" && user?.role === "developer")), [user]);
  const requested = params.get("s") as SectionKey | null;
  const active: SectionKey = requested && visible.some((s) => s.key === requested) ? requested : "general";
  const go = (k: SectionKey) => setParams(k === "general" ? {} : { s: k }, { replace: true });

  const settingsQ = useQuery({ queryKey: ["registration-settings"], queryFn: registrationsApi.settings, enabled: !!user, staleTime: 60_000 });
  const f = useSettingsForm(settingsQ.data);

  const label = (k: SectionKey) => t(`settings_page.nav_${k}`);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="default" className="bg-primary hover:bg-primary/90" asChild>
              <Link to="/home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("common.back")}
              </Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold">{t("settings_page.settings")}</h1>
          </div>

          <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-[240px_1fr]")}>
            {/* Yon panel (mobilda gorizontal tasma) */}
            <nav className={cn(isMobile ? "flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" : "flex flex-col gap-1 sticky top-4 self-start")}>
              {visible.map((s) => {
                const Icon = s.icon;
                const isActive = s.key === active;
                const warn = s.key === "bot" && user && settingsQ.data && !settingsQ.data.bot_token_set;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => go(s.key)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap text-left",
                      isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{label(s.key)}</span>
                    {warn && <span className="h-2 w-2 rounded-full bg-amber-400" />}
                  </button>
                );
              })}
            </nav>

            <div className="min-w-0">
              {active === "general" && <GeneralSection />}
              {user && active === "billing" && <BillingSection />}
              {user && active === "bot" && <BotSection settings={settingsQ.data} f={f} />}
              {user && active === "registration" && <RegistrationSection f={f} />}
              {user && active === "admin" && <AdminSection settings={settingsQ.data} f={f} />}
              {user && active === "station" && <StationSection settings={settingsQ.data} f={f} />}
              {user && active === "tickets" && <TicketsSection settings={settingsQ.data} f={f} />}
              {!user && active !== "general" && <p className="text-muted-foreground">{t("registrations_page.login_required")}</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;

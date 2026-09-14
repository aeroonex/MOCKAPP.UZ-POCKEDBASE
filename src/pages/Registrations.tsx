"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Megaphone,
  Phone,
  PlayCircle,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/Navbar";
import CopyButton from "@/components/CopyButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { showError, showSuccess } from "@/utils/toast";
import { api } from "@/lib/api";
import {
  computeOverall,
  formatCard,
  formatSeq,
  formatSum,
  registrationsApi,
  SKILLS,
  type ArchivePack,
  type PublishPreview,
  type Registration,
  type RegistrationSettings,
  type RegistrationStatus,
  type ScoresPatch,
  type SettingsPatch,
  type Skill,
  type StatusFilter,
} from "@/lib/registrations";
import { cn } from "@/lib/utils";
import { downloadTicketsPdf, ticketDefaults } from "@/lib/tickets";
import StatsPanel from "@/components/StatsPanel";

// ================================================================ umumiy kichik komponentlar

const STATUS_STYLE: Record<RegistrationStatus, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700",
  approved: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700",
  rejected: "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700",
};

const StatusBadge: React.FC<{ status: RegistrationStatus }> = ({ status }) => {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={cn("font-semibold whitespace-nowrap", STATUS_STYLE[status])}>
      {t(`registrations_page.status_${status}`)}
    </Badge>
  );
};

const TelegramLink: React.FC<{ r: Registration }> = ({ r }) =>
  r.telegram_username ? (
    <a href={`https://t.me/${r.telegram_username}`} target="_blank" rel="noreferrer" className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1">
      <Send className="h-3 w-3" />@{r.telegram_username}
    </a>
  ) : null;

/** Bot havolasi: nusxalash / Telegramda ochish / sozlamalar + admin panel holati */
const BotLinkCard: React.FC<{ settings: RegistrationSettings | undefined }> = ({ settings }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const onOpenSettings = (section = "registration") => navigate(`/settings?s=${section}`);
  return (
    <Card className="mb-5 bg-gradient-to-br from-indigo-600 via-sky-600 to-indigo-800 text-white border-0 shadow-xl">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-sky-200" />
            <h3 className="text-lg font-bold">{t("registrations_page.bot_link_title")}</h3>
          </div>
          <Button size="sm" variant="secondary" className="gap-1" onClick={() => onOpenSettings("registration")}>
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t("registrations_page.settings")}</span>
          </Button>
        </div>
        <p className="text-sm text-sky-100 mt-1 mb-3">{t("registrations_page.bot_link_hint")}</p>

        {settings && !settings.bot_token_set && (
          <button type="button" onClick={() => onOpenSettings("bot")} className="w-full text-left text-sm bg-amber-500/30 border border-amber-300/60 rounded-md px-3 py-2 mb-3 hover:bg-amber-500/40 transition-colors">
            🤖 {t("registrations_page.bot_not_connected")}
          </button>
        )}
        {settings && settings.bot_token_set && !settings.bot_running && (
          <p className="text-sm bg-red-500/30 border border-red-300/50 rounded-md px-3 py-2 mb-3">⚠️ {t("registrations_page.bot_offline")}</p>
        )}
        {settings && settings.bot_running && !settings.enabled && (
          <p className="text-sm bg-amber-500/30 border border-amber-300/50 rounded-md px-3 py-2 mb-3">⏸ {t("registrations_page.registration_disabled")}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <code className="block flex-1 min-w-0 w-full max-w-full truncate rounded-md bg-black/30 px-3 py-2 text-sm font-mono select-all" title={settings?.bot_link}>
            {settings?.bot_link || (settings ? t("registrations_page.bot_link_missing") : "…")}
          </code>
          <div className="flex gap-2">
            <CopyButton text={settings?.bot_link || ""} label={t("registrations_page.copy")} copiedLabel={t("registrations_page.copied")} className="flex-1 sm:flex-none" />
            <Button size="sm" variant="secondary" className="gap-1 flex-1 sm:flex-none" asChild disabled={!settings?.bot_link}>
              <a href={settings?.bot_link || "#"} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                {t("registrations_page.open_telegram")}
              </a>
            </Button>
          </div>
        </div>

        {settings && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sky-100">
            {settings.free_mode ? (
              <span>🎁 {t("registrations_page.free")}</span>
            ) : (
              <span>💰 {formatSum(settings.exam_price)} {t("registrations_page.sum")}</span>
            )}
            {!settings.free_mode && settings.card_number && (
              <span>💳 {formatCard(settings.card_number)}{settings.card_holder ? ` · ${settings.card_holder}` : ""}</span>
            )}
            {settings.exam_info && <span>📅 {settings.exam_info}</span>}
            <button
              type="button"
              onClick={() => onOpenSettings("admin")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border transition-colors",
                settings.admins.length ? "bg-emerald-500/25 border-emerald-300/60 hover:bg-emerald-500/40" : "bg-white/10 border-white/30 hover:bg-white/20",
              )}
              title={t("registrations_page.admin_panel")}
            >
              <ShieldCheck className="h-3 w-3" />
              {settings.admins.length
                ? `${t("registrations_page.admins")}: ${settings.admins.length}`
                : t("registrations_page.admin_not_connected")}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/** Chek rasmi / PDF ko'rish oynasi */
const ReceiptDialog: React.FC<{ reg: Registration | null; onClose: () => void }> = ({ reg, onClose }) => {
  const { t } = useTranslation();
  const url = reg ? api.fileUrl(reg.receipt_url) : "";
  const isPdf = url.toLowerCase().endsWith(".pdf");
  return (
    <Dialog open={!!reg} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[calc(100vw-1.5rem)] sm:max-w-2xl rounded-lg">
        <DialogHeader>
          <DialogTitle>
            {t("registrations_page.col_receipt")} — {reg ? formatSeq(reg.seq) : ""} {reg?.full_name}
          </DialogTitle>
          <DialogDescription>
            {reg?.payment_time && <span>🕐 {t("registrations_page.payment_time")}: {reg.payment_time}</span>}
            {reg?.receipt_sent_at && (
              <span className="ml-3">📨 {t("registrations_page.receipt_sent_at")}: {format(new Date(reg.receipt_sent_at), "dd.MM.yyyy HH:mm")}</span>
            )}
          </DialogDescription>
        </DialogHeader>
        {url && (
          <div className="max-h-[70vh] overflow-auto rounded-md border bg-muted/30 flex items-center justify-center">
            {isPdf ? <iframe src={url} title="receipt" className="w-full h-[65vh]" /> : <img src={url} alt="receipt" className="max-h-[68vh] w-auto object-contain" />}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              {t("registrations_page.receipt_open_new")}
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Tasdiqlash / rad etish oynasi (izoh bilan) */
const ReviewDialog: React.FC<{
  target: { reg: Registration; status: "approved" | "rejected" } | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}> = ({ target, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  useEffect(() => setNote(""), [target?.reg.id, target?.status]);
  const isReject = target?.status === "rejected";
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isReject ? t("registrations_page.reject_title") : t("registrations_page.approve_title")} — {target ? formatSeq(target.reg.seq) : ""} {target?.reg.full_name}
          </DialogTitle>
          <DialogDescription>{isReject ? t("registrations_page.reject_desc") : t("registrations_page.approve_desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="review-note">{isReject ? t("registrations_page.reject_reason") : t("registrations_page.note")}</Label>
          <Textarea
            id="review-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isReject ? t("registrations_page.reject_reason_placeholder") : t("registrations_page.note_placeholder")}
            maxLength={500}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t("registrations_page.cancel")}
          </Button>
          <Button variant={isReject ? "destructive" : "default"} onClick={() => onSubmit(note.trim())} disabled={busy}>
            {isReject ? <X className="h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            {isReject ? t("registrations_page.reject") : t("registrations_page.approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ================================================================ ARIZALAR tabi

interface RowActions {
  onReceipt: (r: Registration) => void;
  onReview: (r: Registration, status: "approved" | "rejected") => void;
  onPending: (r: Registration) => void;
  onDelete: (r: Registration) => void;
}

const ActionButtons: React.FC<{ r: Registration; a: RowActions; compact?: boolean }> = ({ r, a, compact }) => {
  const { t } = useTranslation();
  return (
    <div className={cn("flex gap-1.5", compact ? "flex-wrap" : "justify-end")}>
      {r.status !== "approved" && (
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => a.onReview(r, "approved")}>
          <Check className="h-4 w-4" />
          {t("registrations_page.approve")}
        </Button>
      )}
      {r.status !== "rejected" && (
        <Button size="sm" variant="destructive" className="gap-1" onClick={() => a.onReview(r, "rejected")}>
          <X className="h-4 w-4" />
          {t("registrations_page.reject")}
        </Button>
      )}
      {r.status !== "pending" && (
        <Button size="sm" variant="outline" className="gap-1" onClick={() => a.onPending(r)} title={t("registrations_page.set_pending")}>
          <RotateCcw className="h-4 w-4" />
          {compact && t("registrations_page.set_pending")}
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => a.onDelete(r)} title={t("registrations_page.delete")}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

const ReceiptButton: React.FC<{ r: Registration; onOpen: (r: Registration) => void }> = ({ r, onOpen }) => {
  const { t } = useTranslation();
  if (!r.receipt_url) return <span className="text-xs text-muted-foreground">{r.amount === 0 ? "🎁" : t("registrations_page.receipt_none")}</span>;
  const url = api.fileUrl(r.receipt_url);
  const isPdf = url.toLowerCase().endsWith(".pdf");
  return (
    <button type="button" onClick={() => onOpen(r)} className="group inline-flex items-center gap-2" title={t("registrations_page.receipt_view")}>
      {isPdf ? (
        <span className="h-12 w-12 rounded-md border bg-muted flex items-center justify-center text-[10px] font-bold">PDF</span>
      ) : (
        <img src={url} alt="" loading="lazy" className="h-12 w-12 rounded-md border object-cover group-hover:scale-105 transition-transform" />
      )}
      <Receipt className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
    </button>
  );
};

const StatsBar: React.FC<{
  counts: { total: number; pending: number; approved: number; rejected: number } | undefined;
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
}> = ({ counts, value, onChange }) => {
  const { t } = useTranslation();
  const items: { key: StatusFilter; label: string; n: number; cls: string }[] = [
    { key: "all", label: t("registrations_page.stats_total"), n: counts?.total ?? 0, cls: "border-primary text-primary" },
    { key: "pending", label: t("registrations_page.stats_pending"), n: counts?.pending ?? 0, cls: "border-amber-400 text-amber-600 dark:text-amber-300" },
    { key: "approved", label: t("registrations_page.stats_approved"), n: counts?.approved ?? 0, cls: "border-emerald-400 text-emerald-600 dark:text-emerald-300" },
    { key: "rejected", label: t("registrations_page.stats_rejected"), n: counts?.rejected ?? 0, cls: "border-red-400 text-red-600 dark:text-red-300" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={cn(
            "rounded-lg border-2 px-2 py-2 text-center transition-all hover:scale-[1.02]",
            value === it.key ? cn("bg-secondary shadow-md", it.cls) : "border-border text-muted-foreground",
          )}
        >
          <div className="text-xl sm:text-2xl font-bold leading-tight">{it.n}</div>
          <div className="text-[10px] sm:text-xs font-medium leading-tight">{it.label}</div>
        </button>
      ))}
    </div>
  );
};

const ApplicationsTable: React.FC<{ items: Registration[]; a: RowActions }> = ({ items, a }) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[70px]">{t("registrations_page.col_num")}</TableHead>
            <TableHead>{t("registrations_page.col_student")}</TableHead>
            <TableHead>{t("registrations_page.col_phone")}</TableHead>
            <TableHead>{t("registrations_page.col_center")}</TableHead>
            <TableHead>{t("registrations_page.col_payment")}</TableHead>
            <TableHead>{t("registrations_page.col_receipt")}</TableHead>
            <TableHead>{t("registrations_page.col_status")}</TableHead>
            <TableHead className="text-right">{t("registrations_page.col_actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => (
            <TableRow key={r.id} className={cn(r.status === "pending" && "bg-amber-50/50 dark:bg-amber-950/10")}>
              <TableCell className="font-mono font-semibold">{formatSeq(r.seq)}</TableCell>
              <TableCell>
                <div className="font-medium">{r.full_name}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                  <TelegramLink r={r} />
                  <span>{format(new Date(r.created), "dd.MM.yyyy HH:mm")}</span>
                </div>
                {r.note && <div className="text-xs mt-1 text-muted-foreground italic">💬 {r.note}</div>}
              </TableCell>
              <TableCell>
                <a href={`tel:${r.phone}`} className="hover:underline inline-flex items-center gap-1 whitespace-nowrap">
                  <Phone className="h-3 w-3" />
                  {r.phone}
                </a>
              </TableCell>
              <TableCell>
                <div>{r.center_name}</div>
                {r.teacher_name && <div className="text-xs text-muted-foreground">👨‍🏫 {r.teacher_name}</div>}
              </TableCell>
              <TableCell>
                <div className="font-medium whitespace-nowrap">
                  {r.amount === 0 ? `🎁 ${t("registrations_page.free")}` : `${formatSum(r.amount)} ${t("registrations_page.sum")}`}
                </div>
                {r.payment_time && <div className="text-xs text-muted-foreground whitespace-nowrap">🕐 {r.payment_time}</div>}
              </TableCell>
              <TableCell>
                <ReceiptButton r={r} onOpen={a.onReceipt} />
              </TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
              <TableCell className="text-right">
                <ActionButtons r={r} a={a} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const ApplicationsCards: React.FC<{ items: Registration[]; a: RowActions }> = ({ items, a }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <Card key={r.id} className={cn("overflow-hidden", r.status === "pending" && "border-amber-300 dark:border-amber-700")}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">
                  <span className="font-mono text-muted-foreground mr-1">{formatSeq(r.seq)}</span>
                  {r.full_name}
                </div>
                <div className="text-xs text-muted-foreground">{format(new Date(r.created), "dd.MM.yyyy HH:mm")}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
              <span className="text-muted-foreground">📱</span>
              <a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a>
              <span className="text-muted-foreground">🏫</span>
              <span className="truncate">{r.center_name || "—"}</span>
              {r.teacher_name && (
                <>
                  <span className="text-muted-foreground">👨‍🏫</span>
                  <span className="truncate">{r.teacher_name}</span>
                </>
              )}
              <span className="text-muted-foreground">💰</span>
              <span>
                {r.amount === 0 ? `🎁 ${t("registrations_page.free")}` : `${formatSum(r.amount)} ${t("registrations_page.sum")}`}
                {r.payment_time && <span className="text-muted-foreground"> · 🕐 {r.payment_time}</span>}
              </span>
              {r.telegram_username && (
                <>
                  <span className="text-muted-foreground">✈️</span>
                  <TelegramLink r={r} />
                </>
              )}
              {r.note && (
                <>
                  <span className="text-muted-foreground">💬</span>
                  <span className="italic text-muted-foreground">{r.note}</span>
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1 border-t">
              <ReceiptButton r={r} onOpen={a.onReceipt} />
              <ActionButtons r={r} a={a} compact />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ================================================================ NATIJALAR tabi

type ResultFilter = "all" | "waiting" | "ready" | "incomplete" | "published";

const SKILL_META: Record<Skill, { short: string; emoji: string }> = {
  listening: { short: "L", emoji: "🎧" },
  reading: { short: "R", emoji: "📖" },
  writing: { short: "W", emoji: "✍️" },
  speaking: { short: "S", emoji: "🗣" },
};

/** CEFR Multilevel shkalasi (75 ballik): C1 ≥ 65, B2 ≥ 51, B1 ≥ 38 */
function levelOf(overall: number | null): { label: string; cls: string } {
  if (overall === null) return { label: "—", cls: "bg-muted text-muted-foreground border-border" };
  if (overall >= 65) return { label: "C1", cls: "bg-emerald-500 text-white border-emerald-600" };
  if (overall >= 51) return { label: "B2", cls: "bg-sky-500 text-white border-sky-600" };
  if (overall >= 38) return { label: "B1", cls: "bg-amber-500 text-white border-amber-600" };
  return { label: "A2", cls: "bg-rose-500 text-white border-rose-600" };
}

const OverallBadge: React.FC<{ overall: number | null; size?: "sm" | "lg" }> = ({ overall, size = "lg" }) => {
  const lvl = levelOf(overall);
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-xl border-2 px-2.5 py-1 shadow-sm", lvl.cls, size === "lg" ? "min-w-[92px]" : "")}>
      <span className={cn("font-black tabular-nums", size === "lg" ? "text-2xl" : "text-lg")}>{overall === null ? "—" : overall}</span>
      <span className={cn("font-semibold opacity-90", size === "lg" ? "text-xs" : "text-[10px]")}>{lvl.label}</span>
    </div>
  );
};

/** Bitta ko'nikma bali: kiritish maydoni + "topshirilmagan" tugmasi. Blur/Enter'da saqlaydi. */
const ScoreCell: React.FC<{
  reg: Registration;
  skill: Skill;
  onSave: (id: string, patch: ScoresPatch) => Promise<void>;
  highlightMissing: boolean;
}> = ({ reg, skill, onSave, highlightMissing }) => {
  const { t } = useTranslation();
  const serverValue = reg.scores[skill];
  const skipped = reg.skipped[skill];
  const [value, setValue] = useState<string>(serverValue === null ? "" : String(serverValue));
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!focused) setValue(serverValue === null ? "" : String(serverValue));
  }, [serverValue, focused]);

  const commit = async () => {
    const trimmed = value.trim().replace(",", ".");
    const num = trimmed === "" ? null : Number(trimmed);
    if (num !== null && (!Number.isFinite(num) || num < 0 || num > 100)) {
      showError(t("registrations_page.score_invalid"));
      setValue(serverValue === null ? "" : String(serverValue));
      return;
    }
    if (num === serverValue) return;
    setSaving(true);
    try {
      await onSave(reg.id, { [skill]: num });
    } finally {
      setSaving(false);
    }
  };

  const toggleSkip = async () => {
    setSaving(true);
    try {
      await onSave(reg.id, { [`skip_${skill}`]: !skipped });
    } finally {
      setSaving(false);
    }
  };

  const missing = !skipped && serverValue === null && highlightMissing;

  return (
    <div className="flex items-center gap-1">
      {skipped ? (
        <div className="h-9 w-16 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 flex items-center justify-center text-xs text-muted-foreground select-none" title={t("registrations_page.skill_skipped")}>
          —
        </div>
      ) : (
        <div className="relative">
          <Input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              void commit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            placeholder="—"
            className={cn(
              "h-9 w-16 text-center font-semibold tabular-nums px-1",
              missing && "border-red-400 bg-red-50 dark:bg-red-950/30 placeholder:text-red-400",
              serverValue !== null && "border-emerald-300/70",
            )}
            disabled={saving}
          />
          {saving && <Loader2 className="absolute -right-1 -top-1 h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
      )}
      <button
        type="button"
        onClick={toggleSkip}
        disabled={saving}
        className={cn(
          "h-9 w-7 rounded-md border flex items-center justify-center transition-colors",
          skipped ? "bg-rose-500 border-rose-600 text-white" : "border-border text-muted-foreground hover:text-rose-500 hover:border-rose-300",
        )}
        title={skipped ? t("registrations_page.skill_skipped_undo") : t("registrations_page.skill_mark_skipped")}
        aria-pressed={skipped}
      >
        <UserX className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const AttemptsBadge: React.FC<{ r: Registration; onReset?: (r: Registration) => void }> = ({ r, onReset }) => {
  const { t } = useTranslation();
  const exhausted = r.attempts_left <= 0;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "text-[10px] px-1.5 py-0.5 rounded font-semibold",
          exhausted ? "bg-red-500 text-white" : r.attempts > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" : "bg-muted text-muted-foreground",
        )}
        title={t("registrations_page.attempts_title")}
      >
        {exhausted ? "⛔ " : "🎯 "}{r.attempts}/{r.attempt_limit}
      </span>
      {onReset && r.attempts > 0 && (
        <button type="button" onClick={() => onReset(r)} className="text-[10px] text-muted-foreground hover:text-primary underline-offset-2 hover:underline" title={t("registrations_page.attempts_reset")}>
          ↺
        </button>
      )}
    </span>
  );
};

const SpeakingCell: React.FC<{ r: Registration; onResetAttempts?: (r: Registration) => void }> = ({ r, onResetAttempts }) => {
  const { t } = useTranslation();
  const sp = r.speaking;
  if (!sp) {
    return (
      <span className="inline-flex flex-col gap-1 text-xs text-amber-600 dark:text-amber-300">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          {t("registrations_page.speaking_waiting")}
        </span>
        <AttemptsBadge r={r} onReset={onResetAttempts} />
      </span>
    );
  }
  const url = sp.video_url ? api.fileUrl(sp.video_url) : "";
  const dur = `${Math.floor(sp.duration / 60)}:${String(sp.duration % 60).padStart(2, "0")}`;
  return (
    <div className="flex flex-col gap-0.5">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-300 hover:underline">
          <PlayCircle className="h-4 w-4" />
          {t("registrations_page.speaking_has")} · {dur}
        </a>
      ) : (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-300">
          <Check className="h-4 w-4" />
          {t("registrations_page.speaking_has")} · {dur}
        </span>
      )}
      <span className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-1.5">
        {sp.timestamp && <span>{format(new Date(sp.timestamp), "dd.MM HH:mm")}</span>}
        {sp.tg_backup_at && <span title={t("records_page.badge_tg_backup")}>📦</span>}
        {sp.video_deleted_at && <span title={t("records_page.badge_server_deleted")}>🗑</span>}
        <AttemptsBadge r={r} onReset={onResetAttempts} />
      </span>
    </div>
  );
};

function resultState(r: Registration): "published" | "ready" | "incomplete" {
  if (r.results_published_at) return "published";
  return r.results_complete ? "ready" : "incomplete";
}

const ResultStateBadge: React.FC<{ r: Registration }> = ({ r }) => {
  const { t } = useTranslation();
  const st = resultState(r);
  if (st === "published") {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 whitespace-nowrap">
          <Megaphone className="h-3 w-3" />
          {t("registrations_page.res_published")}
        </Badge>
        <span className="text-[10px] text-muted-foreground">{format(new Date(r.results_published_at!), "dd.MM.yyyy HH:mm")}</span>
      </div>
    );
  }
  if (st === "ready") {
    return (
      <Badge variant="outline" className="border-sky-400 text-sky-700 dark:text-sky-300 gap-1 whitespace-nowrap">
        <Check className="h-3 w-3" />
        {t("registrations_page.res_ready")}
      </Badge>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant="outline" className="border-red-400 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 gap-1 whitespace-nowrap">
        <AlertTriangle className="h-3 w-3" />
        {t("registrations_page.res_incomplete")}
      </Badge>
      <span className="text-[11px] text-red-600 dark:text-red-400 leading-tight">
        {t("registrations_page.res_fill")}: {r.missing_skills.map((k) => `${SKILL_META[k].emoji} ${k[0].toUpperCase() + k.slice(1)}`).join(", ")}
      </span>
      {r.results_publish_error && <span className="text-[10px] text-red-500">⚠ {r.results_publish_error}</span>}
    </div>
  );
};

const rowTint = (r: Registration) => {
  const st = resultState(r);
  if (st === "incomplete") return "bg-red-50/70 dark:bg-red-950/15 border-l-4 border-l-red-400";
  if (st === "ready") return "bg-sky-50/60 dark:bg-sky-950/15 border-l-4 border-l-sky-400";
  return "bg-emerald-50/40 dark:bg-emerald-950/10 border-l-4 border-l-emerald-400";
};

interface SelectionProps {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
}

const ResultsTable: React.FC<{
  items: Registration[];
  onSave: (id: string, patch: ScoresPatch) => Promise<void>;
  onResend: (r: Registration) => void;
  onResetAttempts: (r: Registration) => void;
  sel: SelectionProps;
}> = ({ items, onSave, onResend, onResetAttempts, sel }) => {
  const { t } = useTranslation();
  const allIds = items.map((i) => i.id);
  const allChecked = allIds.length > 0 && allIds.every((id) => sel.selected.has(id));
  const someChecked = allIds.some((id) => sel.selected.has(id));
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-[40px]">
              <Checkbox checked={allChecked ? true : someChecked ? "indeterminate" : false} onCheckedChange={() => sel.onToggleAll(allIds)} aria-label="select all" />
            </TableHead>
            <TableHead className="w-[64px]">{t("registrations_page.col_num")}</TableHead>
            <TableHead>{t("registrations_page.col_student")}</TableHead>
            <TableHead>{t("registrations_page.col_speaking")}</TableHead>
            {SKILLS.map((k) => (
              <TableHead key={k} className="text-center whitespace-nowrap">
                <span className="mr-1">{SKILL_META[k].emoji}</span>
                {k[0].toUpperCase() + k.slice(1)}
              </TableHead>
            ))}
            <TableHead className="text-center">{t("registrations_page.col_overall")}</TableHead>
            <TableHead>{t("registrations_page.col_result_status")}</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => {
            const st = resultState(r);
            const liveOverall = computeOverall(r.scores, r.skipped);
            return (
              <TableRow key={r.id} className={cn(rowTint(r), st === "published" && "opacity-80", sel.selected.has(r.id) && "ring-2 ring-inset ring-primary/60")}>
                <TableCell>
                  <Checkbox checked={sel.selected.has(r.id)} onCheckedChange={() => sel.onToggle(r.id)} aria-label="select" />
                </TableCell>
                <TableCell className="font-mono font-semibold">{formatSeq(r.seq)}</TableCell>
                <TableCell>
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                    <a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a>
                    {r.center_name && <span>· {r.center_name}</span>}
                  </div>
                  {r.teacher_name && <div className="text-xs text-muted-foreground">👨‍🏫 {r.teacher_name}</div>}
                </TableCell>
                <TableCell>
                  <SpeakingCell r={r} onResetAttempts={onResetAttempts} />
                </TableCell>
                {SKILLS.map((k) => (
                  <TableCell key={k} className="text-center">
                    <div className="flex justify-center">
                      <ScoreCell reg={r} skill={k} onSave={onSave} highlightMissing={st !== "published"} />
                    </div>
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  <OverallBadge overall={liveOverall} />
                </TableCell>
                <TableCell>
                  <ResultStateBadge r={r} />
                </TableCell>
                <TableCell className="text-right">
                  {st === "published" && (
                    <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" onClick={() => onResend(r)} title={t("registrations_page.res_resend")}>
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

const ResultsCards: React.FC<{
  items: Registration[];
  onSave: (id: string, patch: ScoresPatch) => Promise<void>;
  onResend: (r: Registration) => void;
  onResetAttempts: (r: Registration) => void;
  sel: SelectionProps;
}> = ({ items, onSave, onResend, onResetAttempts, sel }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {items.map((r) => {
        const st = resultState(r);
        return (
          <Card key={r.id} className={cn("overflow-hidden", rowTint(r), sel.selected.has(r.id) && "ring-2 ring-primary/60")}>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Checkbox className="mt-1" checked={sel.selected.has(r.id)} onCheckedChange={() => sel.onToggle(r.id)} aria-label="select" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">
                    <span className="font-mono text-muted-foreground mr-1">{formatSeq(r.seq)}</span>
                    {r.full_name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{r.phone}{r.center_name ? ` · ${r.center_name}` : ""}{r.teacher_name ? ` · 👨‍🏫 ${r.teacher_name}` : ""}</div>
                  <div className="mt-1"><SpeakingCell r={r} onResetAttempts={onResetAttempts} /></div>
                </div>
                <OverallBadge overall={computeOverall(r.scores, r.skipped)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SKILLS.map((k) => (
                  <div key={k} className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2 py-1.5 border">
                    <span className="text-xs font-medium">{SKILL_META[k].emoji} {k[0].toUpperCase() + k.slice(1)}</span>
                    <ScoreCell reg={r} skill={k} onSave={onSave} highlightMissing={st !== "published"} />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t">
                <ResultStateBadge r={r} />
                {st === "published" && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => onResend(r)}>
                    <Send className="h-4 w-4" />
                    {t("registrations_page.res_resend")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

/** E'lon qilishdan oldin tasdiqlash oynasi */
const PublishDialog: React.FC<{
  preview: PublishPreview | null;
  loading: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ preview, loading, busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const readyN = preview?.ready.length ?? 0;
  const incN = preview?.incomplete.length ?? 0;
  return (
    <AlertDialog open={!!preview || loading} onOpenChange={(o) => !o && !busy && onClose()}>
      <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-lg rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            {t("registrations_page.publish_title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              {loading || !preview ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}</div>
              ) : (
                <>
                  <p>{t("registrations_page.publish_desc")}</p>
                  {!preview.bot_running && <p className="text-red-600">⚠️ {t("registrations_page.bot_offline")}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
                      <div className="text-3xl font-black text-emerald-600 dark:text-emerald-300">{readyN}</div>
                      <div className="text-xs font-medium">{t("registrations_page.publish_ready_n")}</div>
                    </div>
                    <div className="rounded-lg border-2 border-red-300 bg-red-50 dark:bg-red-950/30 p-3 text-center">
                      <div className="text-3xl font-black text-red-600 dark:text-red-300">{incN}</div>
                      <div className="text-xs font-medium">{t("registrations_page.publish_incomplete_n")}</div>
                    </div>
                  </div>
                  {incN > 0 && (
                    <div className="rounded-md bg-muted/60 p-2 max-h-36 overflow-auto text-xs space-y-0.5">
                      {preview.incomplete.slice(0, 30).map((i) => (
                        <div key={i.id} className="flex justify-between gap-2">
                          <span className="truncate"><span className="font-mono text-muted-foreground">{formatSeq(i.seq)}</span> {i.full_name}</span>
                          <span className="text-red-600 dark:text-red-400 whitespace-nowrap">{i.missing_skills.map((k) => SKILL_META[k].short).join(" ")}</span>
                        </div>
                      ))}
                      {incN > 30 && <div className="text-muted-foreground">… +{incN - 30}</div>}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t("registrations_page.publish_note")}</p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("registrations_page.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || loading || !preview || readyN === 0 || !preview.bot_running || preview.publishing}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="gap-1"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            {t("registrations_page.publish_confirm", { n: readyN })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const ResultsTab: React.FC<{ search: string }> = ({ search }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<ResultFilter>("all");
  const [preview, setPreview] = useState<PublishPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [resend, setResend] = useState<Registration | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const listQ = useQuery({
    queryKey: ["registrations", "approved", search, "results"],
    queryFn: () => registrationsApi.list("approved", search),
    refetchInterval: 15_000,
  });

  const sel: SelectionProps = useMemo(
    () => ({
      selected,
      onToggle: (id) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      onToggleAll: (ids) =>
        setSelected((prev) => {
          const all = ids.every((id) => prev.has(id));
          const next = new Set(prev);
          if (all) ids.forEach((id) => next.delete(id));
          else ids.forEach((id) => next.add(id));
          return next;
        }),
    }),
    [selected],
  );

  const archiveSelected = async () => {
    setArchiving(true);
    try {
      const res = await registrationsApi.archive([...selected], true);
      showSuccess(t("registrations_page.archived_toast", { n: res.updated }));
      setSelected(new Set());
      setArchiveOpen(false);
      qc.invalidateQueries({ queryKey: ["registrations"] });
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setArchiving(false);
    }
  };

  const items = useMemo(() => listQ.data?.items ?? [], [listQ.data]);
  const counts = useMemo(
    () => ({
      all: items.length,
      waiting: items.filter((r) => !r.speaking && !r.results_published_at).length,
      ready: items.filter((r) => resultState(r) === "ready").length,
      incomplete: items.filter((r) => resultState(r) === "incomplete").length,
      published: items.filter((r) => resultState(r) === "published").length,
    }),
    [items],
  );
  const visible = useMemo(() => {
    switch (filter) {
      case "waiting":
        return items.filter((r) => !r.speaking && !r.results_published_at);
      case "ready":
      case "incomplete":
      case "published":
        return items.filter((r) => resultState(r) === filter);
      default:
        return items;
    }
  }, [items, filter]);

  const onSave = async (id: string, patch: ScoresPatch) => {
    try {
      const updated = await registrationsApi.saveScores(id, patch);
      qc.setQueriesData<{ items: Registration[]; counts: unknown }>({ queryKey: ["registrations"] }, (old) =>
        old ? { ...old, items: old.items.map((x) => (x.id === id ? updated : x)) } : old,
      );
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
      throw e;
    }
  };

  const resetAttempts = async (r: Registration) => {
    if (!window.confirm(t("registrations_page.attempts_reset_confirm", { name: r.full_name }))) return;
    try {
      const updated = await registrationsApi.resetAttempts(r.id);
      qc.setQueriesData<{ items: Registration[]; counts: unknown }>({ queryKey: ["registrations"] }, (old) =>
        old ? { ...old, items: old.items.map((x) => (x.id === r.id ? updated : x)) } : old,
      );
      showSuccess(t("registrations_page.attempts_reset_done"));
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const openPublish = async () => {
    setPreviewLoading(true);
    try {
      setPreview(await registrationsApi.publishPreview());
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmPublish = async () => {
    setPublishing(true);
    try {
      const res = await registrationsApi.publish();
      showSuccess(t("registrations_page.publish_started", { n: res.queued }));
      setPreview(null);
      setTimeout(() => qc.invalidateQueries({ queryKey: ["registrations"] }), 2500);
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setPublishing(false);
    }
  };

  const confirmResend = async () => {
    if (!resend) return;
    setPublishing(true);
    try {
      await registrationsApi.publish([resend.id]);
      showSuccess(t("registrations_page.publish_started", { n: 1 }));
      setResend(null);
      setTimeout(() => qc.invalidateQueries({ queryKey: ["registrations"] }), 2500);
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setPublishing(false);
    }
  };

  const chips: { key: ResultFilter; label: string; n: number; cls: string }[] = [
    { key: "all", label: t("registrations_page.rf_all"), n: counts.all, cls: "border-primary text-primary" },
    { key: "waiting", label: t("registrations_page.rf_waiting"), n: counts.waiting, cls: "border-amber-400 text-amber-600 dark:text-amber-300" },
    { key: "incomplete", label: t("registrations_page.rf_incomplete"), n: counts.incomplete, cls: "border-red-400 text-red-600 dark:text-red-300" },
    { key: "ready", label: t("registrations_page.rf_ready"), n: counts.ready, cls: "border-sky-400 text-sky-600 dark:text-sky-300" },
    { key: "published", label: t("registrations_page.rf_published"), n: counts.published, cls: "border-emerald-400 text-emerald-600 dark:text-emerald-300" },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="grid grid-cols-5 gap-1.5 flex-1">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={cn(
                "rounded-lg border-2 px-1 py-1.5 text-center transition-all hover:scale-[1.02]",
                filter === c.key ? cn("bg-secondary shadow-md", c.cls) : "border-border text-muted-foreground",
              )}
            >
              <div className="text-lg sm:text-xl font-bold leading-tight">{c.n}</div>
              <div className="text-[9px] sm:text-[11px] font-medium leading-tight">{c.label}</div>
            </button>
          ))}
        </div>
        <Button
          onClick={openPublish}
          disabled={previewLoading}
          className="gap-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white shadow-lg shadow-indigo-500/30 h-11 px-5 font-semibold"
        >
          {previewLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Megaphone className="h-5 w-5" />}
          {t("registrations_page.publish_button")}
          {counts.ready > 0 && <span className="ml-1 rounded-full bg-white/25 px-2 text-xs">{counts.ready}</span>}
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-30 mb-3 flex flex-wrap items-center gap-2 rounded-xl border-2 border-primary/50 bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
          <Checkbox checked onCheckedChange={() => setSelected(new Set())} aria-label="clear" />
          <span className="font-semibold text-sm">{t("registrations_page.selected_n", { n: selected.size })}</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              {t("registrations_page.cancel")}
            </Button>
            <Button size="sm" className="gap-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setArchiveOpen(true)}>
              <Archive className="h-4 w-4" />
              {t("registrations_page.archive_selected")}
            </Button>
          </div>
        </div>
      )}

      {listQ.isLoading ? (
        <p className="text-center text-muted-foreground py-10">{t("common.loading")}</p>
      ) : visible.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">{items.length === 0 ? t("registrations_page.results_empty") : t("registrations_page.empty_filtered")}</p>
      ) : isMobile ? (
        <ResultsCards items={visible} onSave={onSave} onResend={setResend} onResetAttempts={resetAttempts} sel={sel} />
      ) : (
        <ResultsTable items={visible} onSave={onSave} onResend={setResend} onResetAttempts={resetAttempts} sel={sel} />
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">{t("registrations_page.results_hint")}</p>

      <AlertDialog open={archiveOpen} onOpenChange={(o) => !o && !archiving && setArchiveOpen(false)}>
        <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-500" />
              {t("registrations_page.archive_title", { n: selected.size })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("registrations_page.archive_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>{t("registrations_page.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
              disabled={archiving}
              onClick={(e) => {
                e.preventDefault();
                void archiveSelected();
              }}
            >
              {archiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              {t("registrations_page.archive_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PublishDialog preview={preview} loading={previewLoading} busy={publishing} onClose={() => setPreview(null)} onConfirm={confirmPublish} />

      <AlertDialog open={!!resend} onOpenChange={(o) => !o && !publishing && setResend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("registrations_page.res_resend")}</AlertDialogTitle>
            <AlertDialogDescription>
              {resend ? `${formatSeq(resend.seq)} ${resend.full_name} — ` : ""}
              {t("registrations_page.res_resend_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishing}>{t("registrations_page.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={publishing}
              onClick={(e) => {
                e.preventDefault();
                void confirmResend();
              }}
            >
              <Send className="h-4 w-4 mr-1" />
              {t("registrations_page.res_resend")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ================================================================ ARXIV tabi

/** Bir kunlik pack: sarlavha (sana, statistika) + ochilganda barcha o'quvchilar to'liq ma'lumoti */
const ArchivePackCard: React.FC<{ pack: ArchivePack; search: string; onRestore: (ids: string[]) => void; busy: boolean }> = ({ pack, search, onRestore, busy }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const q = search.toLowerCase();
  const items = q ? pack.items.filter((r) => `${r.full_name} ${r.phone} ${r.center_name}`.toLowerCase().includes(q)) : pack.items;
  if (q && items.length === 0) return null;
  const [y, m, d] = pack.date.split("-");
  const label = `${d}.${m}.${y}`;

  const exportCsv = () => {
    const head = ["№", "Ism familiya", "Telefon", "O'quv markaz", "Ustoz", "Listening", "Reading", "Writing", "Speaking", "Overall", "Speaking video", "E'lon qilingan"];
    const cell = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = pack.items.map((r) => [
      r.seq, r.full_name, r.phone, r.center_name, r.teacher_name,
      ...SKILLS.map((k) => (r.skipped[k] ? "topshirilmagan" : r.scores[k] ?? "")),
      r.overall ?? "", r.speaking ? "ha" : "yo'q", r.results_published_at ? format(new Date(r.results_published_at), "dd.MM.yyyy HH:mm") : "",
    ]);
    const csv = String.fromCharCode(0xfeff) + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `arxiv-${pack.date}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Card className={cn("overflow-hidden transition-shadow", open && "shadow-lg ring-1 ring-primary/30")}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow">
          <Archive className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-base sm:text-lg">{label}</div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
            <span>👥 {t("registrations_page.pack_students", { n: pack.count })}</span>
            <span>📣 {pack.published}/{pack.count}</span>
            <span>🎥 {pack.with_speaking}/{pack.count}</span>
            {pack.avg_overall !== null && <span>📊 {t("registrations_page.pack_avg")}: <b>{pack.avg_overall}</b></span>}
          </div>
        </div>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button size="sm" variant="outline" className="gap-1" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              {t("registrations_page.export_csv")}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => onRestore(pack.items.map((i) => i.id))}>
              <ArchiveRestore className="h-4 w-4" />
              {t("registrations_page.restore_all")}
            </Button>
          </div>
          {isMobile ? (
            <div className="space-y-2">
              {items.map((r) => (
                <div key={r.id} className="rounded-lg border p-3 space-y-2 bg-background/60">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate"><span className="font-mono text-muted-foreground mr-1">{formatSeq(r.seq)}</span>{r.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.phone}{r.center_name ? ` · ${r.center_name}` : ""}</div>
                    </div>
                    <OverallBadge overall={r.overall} size="sm" />
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center text-xs">
                    {SKILLS.map((k) => (
                      <div key={k} className="rounded-md bg-muted/60 py-1">
                        <div className="text-[10px] text-muted-foreground">{SKILL_META[k].emoji}</div>
                        <div className="font-semibold">{r.skipped[k] ? "—" : r.scores[k] ?? "—"}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <SpeakingCell r={r} />
                    <div className="flex items-center gap-2">
                      {r.results_published_at ? <Badge className="bg-emerald-600 text-white">📣 {format(new Date(r.results_published_at), "dd.MM")}</Badge> : <Badge variant="outline">—</Badge>}
                      <Button size="sm" variant="ghost" className="h-7 px-2" disabled={busy} onClick={() => onRestore([r.id])} title={t("registrations_page.restore")}>
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[64px]">{t("registrations_page.col_num")}</TableHead>
                    <TableHead>{t("registrations_page.col_student")}</TableHead>
                    <TableHead>{t("registrations_page.col_speaking")}</TableHead>
                    {SKILLS.map((k) => (
                      <TableHead key={k} className="text-center whitespace-nowrap">{SKILL_META[k].emoji} {k[0].toUpperCase() + k.slice(1)}</TableHead>
                    ))}
                    <TableHead className="text-center">{t("registrations_page.col_overall")}</TableHead>
                    <TableHead>{t("registrations_page.res_published")}</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-semibold">{formatSeq(r.seq)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.full_name}</div>
                        <div className="text-xs text-muted-foreground">{r.phone}{r.center_name ? ` · ${r.center_name}` : ""}{r.teacher_name ? ` · 👨‍🏫 ${r.teacher_name}` : ""}</div>
                      </TableCell>
                      <TableCell><SpeakingCell r={r} /></TableCell>
                      {SKILLS.map((k) => (
                        <TableCell key={k} className="text-center font-semibold tabular-nums">
                          {r.skipped[k] ? <span className="text-muted-foreground" title={t("registrations_page.skill_skipped")}>—</span> : r.scores[k] ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                      <TableCell className="text-center"><OverallBadge overall={r.overall} size="sm" /></TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.results_published_at ? format(new Date(r.results_published_at), "dd.MM.yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={busy} onClick={() => onRestore([r.id])} title={t("registrations_page.restore")}>
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

const ArchiveTab: React.FC<{ search: string }> = ({ search }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const packsQ = useQuery({ queryKey: ["registrations", "archive"], queryFn: registrationsApi.archivePacks, refetchInterval: 30_000 });

  const restore = async (ids: string[]) => {
    setBusy(true);
    try {
      const res = await registrationsApi.archive(ids, false);
      showSuccess(t("registrations_page.restored_toast", { n: res.updated }));
      qc.invalidateQueries({ queryKey: ["registrations"] });
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const packs = packsQ.data ?? [];
  const total = packs.reduce((a, p) => a + p.count, 0);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
        <Archive className="h-5 w-5 text-amber-500" />
        <span className="font-semibold">{t("registrations_page.archive_summary", { packs: packs.length, students: total })}</span>
        <span className="text-xs text-muted-foreground">{t("registrations_page.archive_hint")}</span>
      </div>
      {packsQ.isLoading ? (
        <p className="text-center text-muted-foreground py-10">{t("common.loading")}</p>
      ) : packs.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">{t("registrations_page.archive_empty")}</p>
      ) : (
        packs.map((p) => <ArchivePackCard key={p.date} pack={p} search={search} onRestore={restore} busy={busy} />)
      )}
    </div>
  );
};

// ================================================================ sahifa

const Registrations: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"applications" | "results" | "archive" | "stats">("applications");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [receipt, setReceipt] = useState<Registration | null>(null);
  const [review, setReview] = useState<{ reg: Registration; status: "approved" | "rejected" } | null>(null);
  const [toDelete, setToDelete] = useState<Registration | null>(null);
  const [exporting, setExporting] = useState(false);
  const [ticketsBusy, setTicketsBusy] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const settingsQ = useQuery({
    queryKey: ["registration-settings"],
    queryFn: registrationsApi.settings,
    enabled: !!user,
    staleTime: 60_000,
  });

  const listQ = useQuery({
    queryKey: ["registrations", filter, debounced],
    queryFn: () => registrationsApi.list(filter, debounced),
    enabled: !!user,
    refetchInterval: 15_000, // yangi arizalar avtomatik ko'rinadi
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (listQ.error) showError(`${t("registrations_page.error_load")}: ${(listQ.error as Error).message}`);
  }, [listQ.error, t]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["registrations"] });

  const reviewM = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: RegistrationStatus; note: string }) => registrationsApi.review(id, status, note),
    onSuccess: (_d, v) => {
      showSuccess(t(`registrations_page.${v.status}_toast`));
      setReview(null);
      invalidate();
    },
    onError: (e: Error) => showError(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => registrationsApi.remove(id),
    onSuccess: () => {
      showSuccess(t("registrations_page.deleted_toast"));
      setToDelete(null);
      invalidate();
    },
    onError: (e: Error) => showError(e.message),
  });

  const actions: RowActions = useMemo(
    () => ({
      onReceipt: setReceipt,
      onReview: (reg, status) => setReview({ reg, status }),
      onPending: (reg) => reviewM.mutate({ id: reg.id, status: "pending", note: "" }),
      onDelete: setToDelete,
    }),
    [reviewM],
  );

  const exportCsv = async () => {
    setExporting(true);
    try {
      await registrationsApi.downloadCsv(tab === "applications" ? filter : "approved", tab === "archive" ? "only" : "exclude");
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setExporting(false);
    }
  };

  /** Joriy tabdagi o'quvchilar uchun A4 chiptalar (PDF) */
  const exportTickets = async () => {
    setTicketsBusy(true);
    try {
      const res = await registrationsApi.list(tab === "applications" ? filter : "approved", debounced, tab === "archive" ? "only" : "exclude");
      const students = tab === "applications" ? res.items : res.items.filter((r) => r.status === "approved");
      if (!students.length) {
        showError(t("registrations_page.tickets_empty"));
        return;
      }
      const pages = await downloadTicketsPdf(students, ticketDefaults(settingsQ.data));
      showSuccess(t("registrations_page.tickets_done", { n: students.length, pages }));
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setTicketsBusy(false);
    }
  };

  const items = listQ.data?.items ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-7xl mx-auto">
          <CardHeader>
            <div className="flex justify-between items-center">
              <Link to="/home">
                <Button variant="default" className="bg-primary hover:bg-primary/90">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("common.back")}
                </Button>
              </Link>
              <CardTitle className="text-xl sm:text-3xl font-bold text-center flex-grow">{t("registrations_page.title")}</CardTitle>
              <div className="w-[80px] h-4"></div>
            </div>
            <CardDescription className="text-center">{t("registrations_page.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {!user ? (
              <p className="text-center text-muted-foreground py-10">{t("registrations_page.login_required")}</p>
            ) : (
              <>
                <BotLinkCard settings={settingsQ.data} />

                <Tabs value={tab} onValueChange={(v) => setTab(v as "applications" | "results" | "archive" | "stats")}>
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <TabsList className="h-11 p-1 grid grid-cols-4 sm:inline-flex">
                      <TabsTrigger value="applications" className="gap-1.5 px-4 h-9 data-[state=active]:shadow-md">
                        <ClipboardList className="h-4 w-4" />
                        {t("registrations_page.tab_applications")}
                        {listQ.data?.counts.pending ? <span className="ml-1 rounded-full bg-amber-500 text-white px-1.5 text-[10px]">{listQ.data.counts.pending}</span> : null}
                      </TabsTrigger>
                      <TabsTrigger value="results" className="gap-1.5 px-4 h-9 data-[state=active]:shadow-md">
                        <GraduationCap className="h-4 w-4" />
                        {t("registrations_page.tab_results")}
                      </TabsTrigger>
                      <TabsTrigger value="archive" className="gap-1.5 px-4 h-9 data-[state=active]:shadow-md">
                        <Archive className="h-4 w-4" />
                        {t("registrations_page.tab_archive")}
                        {listQ.data?.counts.archived ? <span className="ml-1 rounded-full bg-muted-foreground/30 px-1.5 text-[10px]">{listQ.data.counts.archived}</span> : null}
                      </TabsTrigger>
                      <TabsTrigger value="stats" className="gap-1.5 px-4 h-9 data-[state=active]:shadow-md">
                        <BarChart3 className="h-4 w-4" />
                        {t("stats.tab")}
                      </TabsTrigger>
                    </TabsList>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("registrations_page.search_placeholder")} className="pl-9 h-11" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="gap-1 flex-1 sm:flex-none h-11" onClick={() => invalidate()} disabled={listQ.isFetching}>
                        <RefreshCw className={cn("h-4 w-4", listQ.isFetching && "animate-spin")} />
                        <span className="hidden sm:inline">{t("registrations_page.refresh")}</span>
                      </Button>
                      <Button variant="outline" className="gap-1 flex-1 sm:flex-none h-11" onClick={exportCsv} disabled={exporting}>
                        <Download className="h-4 w-4" />
                        {t("registrations_page.export_csv")}
                      </Button>
                      <Button variant="outline" className="gap-1 flex-1 sm:flex-none h-11 border-primary/50 text-primary hover:bg-primary/10" onClick={exportTickets} disabled={ticketsBusy} title={t("registrations_page.tickets_hint")}>
                        {ticketsBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        {t("registrations_page.tickets_button")}
                      </Button>
                    </div>
                  </div>

                  <TabsContent value="applications" className="mt-0">
                    <StatsBar counts={listQ.data?.counts} value={filter} onChange={setFilter} />
                    {listQ.isLoading ? (
                      <p className="text-center text-muted-foreground py-10">{t("common.loading")}</p>
                    ) : items.length === 0 ? (
                      <p className="text-center text-muted-foreground py-10">
                        {filter === "all" && !debounced ? t("registrations_page.empty") : t("registrations_page.empty_filtered")}
                      </p>
                    ) : isMobile ? (
                      <ApplicationsCards items={items} a={actions} />
                    ) : (
                      <ApplicationsTable items={items} a={actions} />
                    )}
                  </TabsContent>

                  <TabsContent value="results" className="mt-0">
                    <ResultsTab search={debounced} />
                  </TabsContent>

                  <TabsContent value="archive" className="mt-0">
                    <ArchiveTab search={debounced} />
                  </TabsContent>

                  <TabsContent value="stats" className="mt-0">
                    <StatsPanel mode="organizer" title={`${settingsQ.data?.center_name || "Edumock"} — ${t("stats.report_title")}`} />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <ReceiptDialog reg={receipt} onClose={() => setReceipt(null)} />
      <ReviewDialog
        target={review}
        busy={reviewM.isPending}
        onClose={() => setReview(null)}
        onSubmit={(note) => review && reviewM.mutate({ id: review.reg.id, status: review.status, note })}
      />
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !deleteM.isPending && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("registrations_page.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `${formatSeq(toDelete.seq)} ${toDelete.full_name} — ` : ""}
              {t("registrations_page.delete_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteM.isPending}>{t("registrations_page.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteM.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (toDelete) deleteM.mutate(toDelete.id);
              }}
            >
              {t("registrations_page.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Registrations;

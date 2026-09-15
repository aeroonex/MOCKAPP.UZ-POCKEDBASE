"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { BarChart3, Building2, CalendarRange, ChevronRight, FileDown, GraduationCap, Loader2, Megaphone, Mic, TrendingUp, Users, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { showError, showSuccess } from "@/utils/toast";
import { downloadStatsPdf, fmtSum, presetRange, statsApi, type GroupRow, type RangePreset, type Stats } from "@/lib/stats";
import { cn } from "@/lib/utils";

const LEVEL_COLORS: Record<string, string> = { C1: "#10b981", B2: "#0ea5e9", B1: "#f59e0b", A2: "#f43f5e" };

const Kpi: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; hint?: string; tone?: string }> = ({ icon: Icon, label, value, hint, tone = "from-indigo-500/15 to-indigo-500/0 text-indigo-500" }) => (
  <Card className="relative overflow-hidden border">
    <div className={cn("absolute inset-x-0 top-0 h-16 bg-gradient-to-b", tone.split(" ").slice(0, 2).join(" "))} />
    <CardContent className="relative p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", tone.split(" ").slice(2).join(" "))} />
      </div>
      <div className="mt-1 text-2xl sm:text-3xl font-black tabular-nums leading-tight">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </CardContent>
  </Card>
);

/**
 * Guruh jadvali (markazlar / ustozlar).
 * `subRows` berilsa qator bosilganda ichki ro'yxat ochiladi — masalan markaz ustiga
 * bosilsa shu markazning ustozlari va ularning o'quvchilari ko'rinadi.
 */
const GroupTable: React.FC<{
  title: string;
  icon: React.ElementType;
  rows: GroupRow[];
  nameLabel: string;
  subRows?: (name: string) => GroupRow[];
  subLabel?: string;
}> = ({ title, icon: Icon, rows, nameLabel, subRows, subLabel }) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [sort, setSort] = useState<keyof GroupRow>("total");
  const [open, setOpen] = useState<string | null>(null);
  const sorted = useMemo(() => [...rows].sort((a, b) => Number(b[sort] ?? -1) - Number(a[sort] ?? -1)), [rows, sort]);
  const kids = (name: string) => (subRows ? subRows(name) : []);
  const toggle = (name: string) => {
    if (!subRows) return;
    setOpen((prev) => (prev === name ? null : name));
  };
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const th = (key: keyof GroupRow, label: string, cls = "") => (
    <TableHead className={cn("cursor-pointer select-none whitespace-nowrap hover:text-primary", cls, sort === key && "text-primary font-bold")} onClick={() => setSort(key)}>
      {label}{sort === key ? " ▾" : ""}
    </TableHead>
  );
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-4 w-4" /></div>
          <h3 className="font-bold">{title}</h3>
          <Badge variant="outline" className="ml-auto">{rows.length}</Badge>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("stats.empty")}</p>
        ) : isMobile ? (
          <div className="space-y-2">
            {sorted.map((r) => (
              <div key={r.name} className="rounded-lg border p-3 space-y-1">
                <div
                  className={cn("flex items-center justify-between gap-2", subRows && kids(r.name).length > 0 && "cursor-pointer")}
                  onClick={() => toggle(r.name)}
                >
                  <span className="font-semibold truncate">
                    {subRows && kids(r.name).length > 0 && (
                      <ChevronRight className={cn("inline h-3.5 w-3.5 mr-1 transition-transform", open === r.name && "rotate-90")} />
                    )}
                    {r.name}
                  </span>
                  <span className="text-sm font-bold">{r.total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(r.total / maxTotal) * 100}%` }} /></div>
                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>✅ {r.approved}</span><span>🎥 {r.with_speaking}</span><span>📣 {r.published}</span><span>📊 {r.avg_overall ?? "—"}</span><span>💰 {fmtSum(r.revenue)}</span>
                </div>
                {open === r.name && kids(r.name).length > 0 && (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{subLabel}</p>
                    {kids(r.name).map((k) => (
                      <div key={k.name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate">{k.name}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {k.total} · ✅ {k.approved} · 📊 {k.avg_overall ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  {th("name", nameLabel)}
                  {th("total", t("stats.total"), "text-right")}
                  {th("approved", t("stats.approved"), "text-right")}
                  {th("with_speaking", t("stats.speaking_short"), "text-right")}
                  {th("published", t("stats.published_short"), "text-right")}
                  {th("avg_overall", t("stats.avg_overall_short"), "text-right")}
                  <TableHead className="text-center">C1 / B2 / B1 / A2</TableHead>
                  {th("revenue", t("stats.revenue"), "text-right")}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((r) => {
                  const children = kids(r.name);
                  const expandable = !!subRows && children.length > 0;
                  return (
                    <React.Fragment key={r.name}>
                      <TableRow
                        className={cn(expandable && "cursor-pointer hover:bg-muted/50", open === r.name && "bg-muted/40")}
                        onClick={() => toggle(r.name)}
                      >
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-1">
                            {expandable && (
                              <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open === r.name && "rotate-90")} />
                            )}
                            <span>{r.name}</span>
                            {expandable && <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{children.length}</Badge>}
                          </div>
                          <div className="h-1 rounded-full bg-muted overflow-hidden mt-1 w-32"><div className="h-full bg-primary" style={{ width: `${(r.total / maxTotal) * 100}%` }} /></div>
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">{r.total}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.approved}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.with_speaking}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.published}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.avg_overall ?? "—"}</TableCell>
                        <TableCell className="text-center text-xs tabular-nums">
                          <span className="text-emerald-600">{r.c1}</span> / <span className="text-sky-600">{r.b2}</span> / <span className="text-amber-600">{r.b1}</span> / <span className="text-rose-600">{r.a2}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">{fmtSum(r.revenue)}</TableCell>
                      </TableRow>
                      {open === r.name &&
                        children.map((k) => (
                          <TableRow key={`${r.name}//${k.name}`} className="bg-muted/20 text-sm">
                            <TableCell className="pl-9">
                              <span className="text-muted-foreground">↳ </span>
                              <span className="font-medium">{k.name}</span>
                              {subLabel && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">{subLabel}</span>}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{k.total}</TableCell>
                            <TableCell className="text-right tabular-nums">{k.approved}</TableCell>
                            <TableCell className="text-right tabular-nums">{k.with_speaking}</TableCell>
                            <TableCell className="text-right tabular-nums">{k.published}</TableCell>
                            <TableCell className="text-right tabular-nums">{k.avg_overall ?? "—"}</TableCell>
                            <TableCell className="text-center text-xs tabular-nums">
                              <span className="text-emerald-600">{k.c1}</span> / <span className="text-sky-600">{k.b2}</span> / <span className="text-amber-600">{k.b1}</span> / <span className="text-rose-600">{k.a2}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums whitespace-nowrap">{fmtSum(k.revenue)}</TableCell>
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/** Statistika paneli: tashkilotchi (mode=organizer) yoki superadmin (mode=admin) */
const StatsPanel: React.FC<{ mode: "organizer" | "admin"; title: string }> = ({ mode, title }) => {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [custom, setCustom] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [pdfBusy, setPdfBusy] = useState(false);

  const range = useMemo(() => (preset === "custom" ? { from: custom.from || undefined, to: custom.to || undefined } : presetRange(preset)), [preset, custom]);
  const q = useQuery({
    queryKey: ["stats", mode, range.from ?? "", range.to ?? ""],
    queryFn: () => (mode === "admin" ? statsApi.admin(range) : statsApi.organizer(range)),
    staleTime: 30_000,
  });
  const s = q.data;
  const T = s?.totals;

  const labels = useMemo(
    () => ({
      period: t("stats.period"), generated: t("stats.generated"), all_time: t("stats.all_time"), total: t("stats.total"), approved: t("stats.approved"),
      with_speaking: t("stats.with_speaking"), published: t("stats.published"), avg_overall: t("stats.avg_overall"), revenue: t("stats.revenue"), sum: t("billing.sum"),
      pending: t("stats.pending"), rejected: t("stats.rejected"), skills: t("stats.skills"), levels: t("stats.levels"), daily: t("stats.daily"),
      by_center: t("stats.by_center"), by_teacher: t("stats.by_teacher"), by_organizer: t("stats.by_organizer"), center: t("stats.center"), teacher: t("stats.teacher"),
      organizer: t("stats.organizer"), speaking_short: t("stats.speaking_short"), published_short: t("stats.published_short"), avg_overall_short: t("stats.avg_overall_short"),
      total_short: t("stats.total_short"), approved_short: t("stats.approved_short"),
    }),
    [t],
  );

  const exportPdf = async () => {
    if (!s) return;
    setPdfBusy(true);
    try {
      await downloadStatsPdf(s, { title, labels });
      showSuccess(t("stats.pdf_done"));
    } catch (e) {
      showError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setPdfBusy(false);
    }
  };

  const presets: { key: RangePreset; label: string }[] = [
    { key: "today", label: t("stats.p_today") },
    { key: "7d", label: t("stats.p_7d") },
    { key: "30d", label: t("stats.p_30d") },
    { key: "month", label: t("stats.p_month") },
    { key: "prev_month", label: t("stats.p_prev_month") },
    { key: "all", label: t("stats.p_all") },
    { key: "custom", label: t("stats.p_custom") },
  ];

  const levelData = s ? (["C1", "B2", "B1", "A2"] as const).map((k) => ({ name: k, value: s.levels[k] })) : [];
  const skillData = T
    ? [
        { name: "Listening", v: T.avg_listening ?? 0 },
        { name: "Reading", v: T.avg_reading ?? 0 },
        { name: "Writing", v: T.avg_writing ?? 0 },
        { name: "Speaking", v: T.avg_speaking ?? 0 },
      ]
    : [];
  const daily = (s?.daily ?? []).map((d) => ({ ...d, label: d.day.slice(5).replace("-", ".") }));
  const conv = T && T.total ? Math.round((T.with_speaking / T.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Davr tanlash */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-3 sm:p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={cn("rounded-full px-3 py-1.5 text-xs font-medium border transition-colors", preset === p.key ? "bg-primary text-primary-foreground border-primary shadow" : "hover:bg-muted")}
              >
                {p.label}
              </button>
            ))}
            <Button onClick={exportPdf} disabled={!s || pdfBusy} className="ml-auto gap-2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 text-white shadow-lg shadow-indigo-500/30">
              {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {t("stats.pdf")}
            </Button>
          </div>
          {preset === "custom" && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="w-44" />
              <span className="text-muted-foreground">—</span>
              <Input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="w-44" />
            </div>
          )}
          {s && (
            <div className="text-xs text-muted-foreground">
              {t("stats.period")}: <b>{s.range.from ? format(new Date(s.range.from + "T00:00:00"), "dd.MM.yyyy") : "…"} — {s.range.to ? format(new Date(s.range.to + "T00:00:00"), "dd.MM.yyyy") : "…"}</b>
            </div>
          )}
        </CardContent>
      </Card>

      {q.isLoading || !T ? (
        <p className="text-center text-muted-foreground py-10">{t("common.loading")}</p>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={Users} label={t("stats.total")} value={T.total} hint={`✅ ${T.approved} · ⏳ ${T.pending} · ❌ ${T.rejected}`} />
            <Kpi icon={Mic} label={t("stats.with_speaking")} value={T.with_speaking} hint={t("stats.conversion", { p: conv })} tone="from-emerald-500/15 to-emerald-500/0 text-emerald-500" />
            <Kpi icon={Megaphone} label={t("stats.published")} value={T.published} hint={T.archived ? `📦 ${T.archived} ${t("stats.archived")}` : undefined} tone="from-sky-500/15 to-sky-500/0 text-sky-500" />
            <Kpi icon={TrendingUp} label={t("stats.avg_overall")} value={T.avg_overall ?? "—"} hint={T.avg_attempts ? t("stats.avg_attempts", { n: T.avg_attempts }) : undefined} tone="from-amber-500/15 to-amber-500/0 text-amber-500" />
            <Kpi icon={Wallet} label={t("stats.revenue")} value={<span>{fmtSum(T.revenue)} <span className="text-sm font-semibold text-muted-foreground">{t("billing.sum")}</span></span>} hint={T.free_count ? `🎁 ${T.free_count} ${t("stats.free")}` : undefined} tone="from-fuchsia-500/15 to-fuchsia-500/0 text-fuchsia-500" />
            <Kpi icon={Building2} label={t("stats.centers")} value={s!.by_center.length} tone="from-indigo-500/15 to-indigo-500/0 text-indigo-500" />
            <Kpi icon={GraduationCap} label={t("stats.teachers")} value={s!.by_teacher.filter((r) => r.name !== "—").length} tone="from-rose-500/15 to-rose-500/0 text-rose-500" />
            <Kpi icon={BarChart3} label={t("stats.exhausted")} value={T.attempts_exhausted} tone="from-slate-500/15 to-slate-500/0 text-slate-500" />
          </div>

          {/* Grafiklar */}
          <div className="grid lg:grid-cols-3 gap-3">
            <Card className="lg:col-span-2">
              <CardContent className="p-4">
                <h3 className="font-bold mb-2">{t("stats.daily")}</h3>
                {daily.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">{t("stats.empty")}</p>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" opacity={0.3} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="total" name={t("stats.total")} fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="approved" name={t("stats.approved")} fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="speaking" name={t("stats.speaking_short")} fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold mb-2">{t("stats.levels")}</h3>
                {levelData.every((d) => d.value === 0) ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">{t("stats.empty")}</p>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={levelData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3} label={(d) => `${d.name} ${d.value}`} labelLine={false} fontSize={11}>
                          {levelData.map((d) => <Cell key={d.name} fill={LEVEL_COLORS[d.name]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ko'nikmalar */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold mb-3">{t("stats.skills")}</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {skillData.map((k) => (
                  <div key={k.name} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between text-sm"><span className="font-medium">{k.name}</span><span className="font-black text-lg">{k.v || "—"}</span></div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden mt-2"><div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${Math.min(100, (k.v / 75) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Kesimlar */}
          {mode === "admin" && s!.by_organizer && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3"><div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Building2 className="h-4 w-4" /></div><h3 className="font-bold">{t("stats.by_organizer")}</h3></div>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/40"><TableHead>{t("stats.organizer")}</TableHead><TableHead>Email</TableHead><TableHead className="text-right">{t("stats.total")}</TableHead><TableHead className="text-right">{t("stats.approved")}</TableHead><TableHead className="text-right">{t("stats.speaking_short")}</TableHead><TableHead className="text-right">{t("stats.published_short")}</TableHead><TableHead className="text-right">{t("stats.avg_overall_short")}</TableHead><TableHead className="text-right">{t("stats.revenue")}</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {s!.by_organizer.map((o) => (
                        <TableRow key={o.user_id}><TableCell className="font-semibold">{o.organizer}</TableCell><TableCell className="text-xs text-muted-foreground">{o.email}</TableCell><TableCell className="text-right font-bold">{o.total}</TableCell><TableCell className="text-right">{o.approved}</TableCell><TableCell className="text-right">{o.with_speaking}</TableCell><TableCell className="text-right">{o.published}</TableCell><TableCell className="text-right">{o.avg_overall ?? "—"}</TableCell><TableCell className="text-right whitespace-nowrap">{fmtSum(o.revenue)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
          <GroupTable
            title={t("stats.by_center")}
            icon={Building2}
            rows={s!.by_center}
            nameLabel={t("stats.center")}
            subLabel={t("stats.teacher")}
            subRows={(center) => (s!.by_center_teacher ?? []).filter((r) => r.center === center)}
          />
          <GroupTable title={t("stats.by_teacher")} icon={GraduationCap} rows={s!.by_teacher} nameLabel={t("stats.teacher")} />
        </>
      )}
    </div>
  );
};

export default StatsPanel;

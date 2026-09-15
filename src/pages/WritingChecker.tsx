"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  PenLine, ImagePlus, Type, Sparkles, Wallet, Loader2, X, Check, AlertTriangle, Lightbulb, FileText, Coins, ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { showError } from "@/utils/toast";
import {
  CRITERIA_LABEL, WRITING_MODELS, evaluateWriting, getWritingBalance, writingLevel,
  type WritingAnalysis,
} from "@/lib/writing";

const fmtSom = (n: number) => `${new Intl.NumberFormat("uz-UZ").format(Math.round(n))} so'm`;

/** Doiraviy ball ko'rsatkichi */
const ScoreRing: React.FC<{ value: number; max: number; size?: number }> = ({ value, max, size = 128 }) => {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? value / max : 0;
  const lvl = writingLevel((value / max) * 75);
  const color = ratio >= 0.85 ? "#059669" : ratio >= 0.68 ? "#0284c7" : ratio >= 0.5 ? "#d97706" : "#e11d48";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - ratio) }}
          transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-black tabular-nums text-foreground">{value}</div>
        <div className="text-[11px] font-semibold text-muted-foreground">/ {max}</div>
      </div>
    </div>
  );
};

const CriterionCard: React.FC<{ label: string; score: number; max: number; reason: string; i: number }> = ({ label, score, max, reason, i }) => {
  const ratio = max > 0 ? score / max : 0;
  const bar = ratio >= 0.85 ? "bg-emerald-500" : ratio >= 0.68 ? "bg-sky-500" : ratio >= 0.5 ? "bg-amber-500" : "bg-rose-500";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.4 }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-bold text-foreground">{label}</h4>
        <span className="text-lg font-black tabular-nums text-foreground">{score}<span className="text-xs font-semibold text-muted-foreground">/{max}</span></span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div className={cn("h-full rounded-full", bar)} initial={{ width: 0 }} animate={{ width: `${ratio * 100}%` }} transition={{ delay: 0.05 * i + 0.1, duration: 0.6 }} />
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{reason}</p>
    </motion.div>
  );
};

const WritingChecker: React.FC = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"image" | "text">("image");
  const [task, setTask] = useState("");
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [model, setModel] = useState(WRITING_MODELS[0].id);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WritingAnalysis | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const balanceQ = useQuery({ queryKey: ["writing-balance"], queryFn: getWritingBalance });
  const balance = result?.balance_som ?? balanceQ.data?.balance_som ?? 0;

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 3 - images.length);
    list.forEach((f) => {
      if (!f.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => (prev.length < 3 ? [...prev, String(reader.result)] : prev));
      reader.readAsDataURL(f);
    });
  };

  const canSubmit = mode === "image" ? images.length > 0 : text.trim().length > 20;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await evaluateWriting({ task: task.trim() || undefined, text: mode === "text" ? text : undefined, images: mode === "image" ? images : undefined, model });
      setResult(r);
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setImages([]);
    setText("");
  };

  const lvl = result ? writingLevel(result.overall) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-grow px-3 py-5 sm:px-6 sm:py-8">
        {/* Sarlavha + balans */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <Link to="/home"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30">
              <PenLine className="h-6 w-6" />
            </span>
            <div>
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                {t("writing.title")}
                <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {t("writing.demo_badge")}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">{t("writing.subtitle")}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 sm:self-auto">
            <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div className="leading-tight">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("writing.balance")}</div>
              <div className="text-sm font-black tabular-nums text-foreground">{fmtSom(balance)}</div>
            </div>
          </div>
        </div>

        {/* Ogohlantirish: AI hali ulanmagan — natijalar namunaviy */}
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">{t("writing.demo_note")}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Kirish */}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-4 inline-flex rounded-lg border border-border bg-muted/40 p-1">
              <button type="button" onClick={() => setMode("image")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold", mode === "image" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                <ImagePlus className="h-4 w-4" /> {t("writing.tab_image")}
              </button>
              <button type="button" onClick={() => setMode("text")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold", mode === "text" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                <Type className="h-4 w-4" /> {t("writing.tab_text")}
              </button>
            </div>

            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("writing.task_label")}</label>
            <Textarea value={task} onChange={(e) => setTask(e.target.value)} rows={2} placeholder={t("writing.task_ph")} className="mb-4 resize-none" />

            {mode === "image" ? (
              <div>
                <div
                  onClick={() => images.length < 3 && fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                  className={cn("grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center transition-colors hover:border-violet-500/50", images.length >= 3 && "pointer-events-none opacity-60")}
                >
                  <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">{t("writing.drop_title")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("writing.drop_hint")}</p>
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
                </div>
                {images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {images.map((src, i) => (
                      <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                        <img src={src} alt="" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder={t("writing.text_ph")} className="resize-none" />
            )}

            {/* Model + baholash */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <select value={model} onChange={(e) => setModel(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground sm:w-56">
                {WRITING_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <Button onClick={submit} disabled={!canSubmit || busy} className="h-11 flex-1 gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {busy ? t("writing.evaluating") : t("writing.evaluate")}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{t("writing.cost_hint")}</p>
          </section>

          {/* Natija */}
          <section className="min-h-[300px]">
            {!result && !busy && (
              <div className="grid h-full min-h-[300px] place-items-center rounded-2xl border border-dashed border-border text-center">
                <div className="p-6 text-muted-foreground">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm">{t("writing.empty")}</p>
                </div>
              </div>
            )}
            {busy && (
              <div className="grid h-full min-h-[300px] place-items-center rounded-2xl border border-border bg-card">
                <div className="p-6 text-center text-muted-foreground">
                  <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-violet-500" />
                  <p className="text-sm font-semibold text-foreground">{t("writing.evaluating")}</p>
                  <p className="mt-1 text-xs">{t("writing.evaluating_hint")}</p>
                </div>
              </div>
            )}
            {result && lvl && (
              <div className="space-y-4">
                {/* Umumiy ball */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-5 rounded-2xl border border-border bg-card p-5">
                  <ScoreRing value={result.overall} max={75} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("grid h-9 min-w-[3.5rem] place-items-center rounded-lg px-2 text-lg font-black text-white", lvl.cls)}>{lvl.label}</span>
                      <Badge variant="outline" className="text-muted-foreground">{result.word_count} {t("writing.words")}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
                  </div>
                </motion.div>

                {/* Mezonlar */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.criteria.map((c, i) => (
                    <CriterionCard key={c.key} i={i} label={CRITERIA_LABEL[c.key]} score={c.score} max={c.max} reason={c.reason} />
                  ))}
                </div>

                {/* Maslahatlar */}
                {result.suggestions.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <h4 className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 dark:text-amber-400"><Lightbulb className="h-4 w-4" /> {t("writing.suggestions")}</h4>
                    <ul className="space-y-1.5">
                      {result.suggestions.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm text-foreground"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tuzatishlar */}
                {result.corrections.some((c) => c.wrong !== c.right) && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h4 className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-foreground"><AlertTriangle className="h-4 w-4 text-rose-500" /> {t("writing.corrections")}</h4>
                    <div className="space-y-2">
                      {result.corrections.filter((c) => c.wrong !== c.right).map((c, i) => (
                        <div key={i} className="text-sm">
                          <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-rose-700 line-through dark:text-rose-300">{c.wrong}</span>
                          <span className="mx-1.5 text-muted-foreground">→</span>
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">{c.right}</span>
                          {c.note && <span className="ml-1.5 text-xs text-muted-foreground">({c.note})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* O'qilgan matn */}
                <details className="rounded-xl border border-border bg-muted/20 p-4">
                  <summary className="cursor-pointer text-sm font-bold text-foreground"><FileText className="mr-1.5 inline h-4 w-4" /> {t("writing.extracted")}</summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{result.extracted_text}</p>
                </details>

                {/* Token / narx */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Coins className="h-4 w-4" /> {result.usage.total_tokens.toLocaleString()} token · <span className="font-semibold text-foreground">{fmtSom(result.usage.cost_som)}</span></span>
                  <span className="text-muted-foreground">{t("writing.balance")}: <span className="font-bold text-foreground">{fmtSom(result.balance_som)}</span></span>
                  <Button variant="outline" size="sm" onClick={reset} className="gap-1.5"><Check className="h-3.5 w-3.5" /> {t("writing.new_check")}</Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      <AppFooter />
    </div>
  );
};

export default WritingChecker;

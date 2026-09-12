"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./Reveal";
import { DrawLineX, FlipIn, WordsInView } from "./motion";
import { cn } from "@/lib/utils";

/**
 * Imtihon bosqichlari — ilova mantiqidagi haqiqiy vaqtlar (use-mock-test-logic.tsx: TIMINGS).
 * Gorizontal "trek": chiziq scroll bilan chiziladi, kartalar ketma-ket chiqadi.
 */
const ExamSteps: React.FC = () => {
  const { t } = useTranslation();

  const steps = [
    { part: "Part 1.1", what: t("landing_page.flow_p11"), prep: null, answer: "30 s", media: t("landing_page.flow_text"), tone: "bg-[var(--l-blue)] text-white" },
    { part: "Part 1.2", what: t("landing_page.flow_p12"), prep: null, answer: "45 s · 30 s", media: t("landing_page.flow_image"), tone: "bg-[#1d4ed8] text-white" },
    { part: "Part 2", what: t("landing_page.flow_p2"), prep: "60 s", answer: "120 s", media: t("landing_page.flow_image"), tone: "bg-[var(--l-ink)] text-[#bef264]" },
    { part: "Part 3", what: t("landing_page.flow_p3"), prep: "60 s", answer: "120 s", media: t("landing_page.flow_text"), tone: "bg-[#bef264] text-[var(--l-ink)]" },
  ];

  return (
    <section id="how" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid items-end gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <p className="kicker">{t("landing_page.how_kicker")}</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[var(--l-ink)] sm:text-5xl"><WordsInView text={t("landing_page.how_title")} /></h2>
          </Reveal>
          <Reveal className="lg:col-span-5" delay={0.1}>
            <p className="text-lg text-[var(--l-muted)]">{t("landing_page.how_desc")}</p>
            <p className="mt-3 text-sm text-slate-500">{t("landing_page.flow_note")}</p>
          </Reveal>
        </div>

        <div className="mt-12">
          <DrawLineX className="mb-6 hidden lg:block" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <FlipIn key={s.part} delay={i * 0.14} from={i < 2 ? "left" : "right"} className="h-full">
                <div className="group relative h-full rounded-3xl border border-[var(--l-line)] bg-[var(--l-bg)] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_24px_50px_-24px_rgba(15,23,42,0.25)]">
                  <div className="flex items-center justify-between">
                    <span className={cn("rounded-xl px-3 py-1.5 text-sm font-black tracking-tight", s.tone)}>{s.part}</span>
                    <span className="text-5xl font-black tracking-[-0.05em] text-[var(--l-line)] transition-colors group-hover:text-[var(--l-blue)]/20">0{i + 1}</span>
                  </div>
                  <p className="mt-5 text-base font-bold text-[var(--l-ink)]">{s.what}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-white p-3 ring-1 ring-[var(--l-line)]">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("landing_page.flow_col_prep")}</dt>
                      <dd className="mt-1 text-lg font-black tabular-nums text-[var(--l-ink)]">{s.prep ?? "—"}</dd>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-[var(--l-line)]">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("landing_page.flow_col_answer")}</dt>
                      <dd className="mt-1 text-lg font-black tabular-nums text-[var(--l-blue)]">{s.answer}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs text-slate-500">{t("landing_page.flow_col_media")}: <span className="font-semibold text-[var(--l-ink)]">{s.media}</span></p>
                </div>
              </FlipIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExamSteps;

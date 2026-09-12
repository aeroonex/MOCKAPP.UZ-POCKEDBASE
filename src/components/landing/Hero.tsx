"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Cloud, Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tilt3D, Depth, SplitWords } from "./motion";

interface HeroProps {
  onTryGuest: () => void;
  onOpenPricing: () => void;
  busy: boolean;
}

const ease = [0.22, 0.61, 0.36, 1] as const;

/** Jonli taymer — 2:00 dan sanaydi (Part 2 javob vaqti), tugasa qayta boshlaydi. */
const useCountdown = (total = 120) => {
  const [left, setLeft] = useState(84);
  useEffect(() => {
    const id = setInterval(() => setLeft((v) => (v <= 1 ? total : v - 1)), 1000);
    return () => clearInterval(id);
  }, [total]);
  const m = Math.floor(left / 60);
  const s = left % 60;
  return { label: `${m}:${s.toString().padStart(2, "0")}`, ratio: left / total };
};

/** 3D sahna: ilova oynasi + chuqurlikdagi suzuvchi kartalar. */
const ExamScene: React.FC = () => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { label, ratio } = useCountdown(120);
  const C = 2 * Math.PI * 34;

  return (
    <Tilt3D max={9} className="relative mx-auto w-full max-w-[560px]">
      {/* Orqa qatlam — soya kartasi */}
      <Depth z={-40} className="absolute inset-4 rounded-[1.6rem] bg-[var(--l-blue)]/10" />

      {/* Asosiy oyna */}
      <Depth z={0}>
        <div className="scene-window overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0f172a] text-white">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-xs text-slate-400">edumock.uz/mock-test</span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-red-400">
              <span className="rec-dot h-2 w-2 rounded-full bg-red-500" /> REC
            </span>
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center">
                <svg viewBox="0 0 76 76" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="38" cy="38" r="34" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                  <circle
                    cx="38" cy="38" r="34" stroke="#bef264" strokeWidth="6" fill="none" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - ratio)}
                    style={{ transition: "stroke-dashoffset 0.9s linear" }}
                  />
                </svg>
                <span className="text-lg font-black tabular-nums">{label}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Part 2 · {t("add_question_page.answer").replace(/:$/, "")}</p>
                <p className="mt-1 text-[15px] font-semibold leading-snug sm:text-base">{t("landing_page.mock_question")}</p>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
              <img src="/images/speaking-scene.svg" alt="" width={800} height={350} className="aspect-[16/7] w-full object-cover" decoding="async" />
            </div>
            <div className="mt-4 flex items-end gap-[3px]" aria-hidden="true">
              {[8, 14, 22, 12, 18, 26, 10, 16, 24, 14, 20, 9, 15, 23, 11, 17, 25, 13, 19, 8, 12, 20, 16, 10].map((h, i) => (
                <span key={i} className="wave-bar w-1.5 origin-bottom rounded-sm bg-[#bef264]" style={{ height: h, animationDelay: `${(i % 7) * 0.13}s` }} />
              ))}
              <Mic className="ml-2 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
      </Depth>

      {/* Suzuvchi kartalar — turli chuqurlikda */}
      <Depth z={70} className="absolute -left-6 bottom-24 hidden sm:block">
        <motion.div
          animate={reduce ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className="float-card"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--l-blue)] text-white"><Check className="h-4 w-4" /></span>
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Part 1.1 · 1.2</span>
            <span className="block text-sm font-bold text-[var(--l-ink)]">{t("landing_page.scene_done")}</span>
          </span>
        </motion.div>
      </Depth>
      <Depth z={90} className="absolute -right-5 bottom-10 hidden sm:block">
        <motion.div
          animate={reduce ? undefined : { y: [0, 9, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="float-card"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#bef264] text-[var(--l-ink)]"><Cloud className="h-4 w-4" /></span>
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">EduCloud</span>
            <span className="block text-sm font-bold text-[var(--l-ink)]">{t("landing_page.scene_saved")}</span>
          </span>
        </motion.div>
      </Depth>
    </Tilt3D>
  );
};

const Hero: React.FC<HeroProps> = ({ onTryGuest, onOpenPricing, busy }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const fade = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease },
  });

  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div aria-hidden="true" className="hero-blobs pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
        <div className="lg:col-span-6">
          <motion.p {...fade(0)} className="inline-flex items-center gap-2 rounded-full border border-[var(--l-line)] bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--l-blue)] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--l-blue)]" />
            {t("landing_page.hero_badge")}
          </motion.p>

          <h1 className="mt-6 text-[2.5rem] font-black leading-[1.04] tracking-[-0.03em] text-[var(--l-ink)] sm:text-[3.4rem] lg:text-[4rem]">
            <SplitWords text={t("landing_page.hero_title_a")} delay={0.05} />{" "}
            <span className="marker-hl">
              <SplitWords text={t("landing_page.hero_title_hl")} delay={0.25} />
            </span>{" "}
            <SplitWords text={t("landing_page.hero_title_b")} delay={0.4} />
          </h1>

          <motion.p {...fade(0.45)} className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--l-muted)] sm:text-xl">
            {t("landing_page.hero_desc")}
          </motion.p>

          <motion.div {...fade(0.55)} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={onTryGuest} disabled={busy} className="btn-cta group">
              {t("landing_page.cta_free")}
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={onOpenPricing} disabled={busy} className="btn-ghost">
              {t("landing_page.nav_pricing")}
            </button>
          </motion.div>

          <motion.ul {...fade(0.65)} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--l-muted)]">
            {[t("landing_page.trust_1"), t("landing_page.trust_2"), t("landing_page.trust_3")].map((x) => (
              <li key={x} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[var(--l-blue)]" /> {x}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.3, ease }}
          style={{ transformPerspective: 1400 }}
          className="relative lg:col-span-6"
        >
          <ExamScene />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;

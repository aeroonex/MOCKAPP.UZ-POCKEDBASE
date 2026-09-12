"use client";

import React from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import Reveal from "./Reveal";
import { ParallaxX, Rise3D, WordsInView } from "./motion";
import { QuestionsMock, RecordingsMock } from "./ui-mocks";

/**
 * Kontrast (to'q) bo'lim — "hech narsa yo'qolmaydi" (yo'qotishdan himoya) + savollar bazasi.
 */
const DarkBand: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="band" className="dark-band relative overflow-hidden py-20 text-white sm:py-28">
      <div aria-hidden="true" className="band-glow pointer-events-none absolute inset-0" />
      {/* Katta suv belgisi — scroll bilan gorizontal siljiydi */}
      <ParallaxX from={120} to={-220} className="pointer-events-none absolute -top-6 left-0 select-none whitespace-nowrap text-[9rem] font-black leading-none tracking-[-0.06em] text-white/[0.07] sm:text-[14rem]">
        CEFR SPEAKING · EDUCLOUD · MOCK
      </ParallaxX>
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="kicker kicker-light">{t("landing_page.band_kicker")}</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              <WordsInView text={t("landing_page.band_title_a")} /> <WordsInView text={t("landing_page.band_title_hl")} className="text-[#bef264]" />
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-300">{t("landing_page.band_desc")}</p>
            <ul className="mt-7 space-y-3">
              {[t("landing_page.feat_record_p1"), t("landing_page.feat_record_p2"), t("landing_page.feat_record_p3")].map((p) => (
                <li key={p} className="flex items-start gap-3 text-[15px] text-slate-200">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#bef264] text-[var(--l-ink)]">
                    <Check className="h-3 w-3" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
          <div className="lg:col-span-7">
            <Rise3D>
              <ParallaxX from={60} to={-30}>
                <RecordingsMock />
              </ParallaxX>
            </Rise3D>
          </div>
        </div>

        <div className="mt-24 grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7 lg:order-1">
            <Rise3D>
              <ParallaxX from={-60} to={30}>
                <QuestionsMock />
              </ParallaxX>
            </Rise3D>
          </div>
          <Reveal className="lg:col-span-5 lg:order-2">
            <p className="kicker kicker-light">{t("landing_page.feat_questions_title")}</p>
            <h3 className="mt-3 text-2xl font-black tracking-[-0.02em] sm:text-4xl"><WordsInView text={t("landing_page.q_title")} /></h3>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">{t("landing_page.feat_questions_desc")}</p>
            <ul className="mt-6 space-y-3">
              {[t("landing_page.feat_questions_p1"), t("landing_page.feat_questions_p2"), t("landing_page.feat_questions_p3")].map((p) => (
                <li key={p} className="flex items-start gap-3 text-[15px] text-slate-200">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--l-blue)] text-white">
                    <Check className="h-3 w-3" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default DarkBand;

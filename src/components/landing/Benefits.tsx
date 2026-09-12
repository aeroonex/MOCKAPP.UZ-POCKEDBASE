"use client";

import React from "react";
import { Clock3, ListChecks, ShieldCheck, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import Reveal from "./Reveal";
import { Tilt3D, Depth, FlipIn, WordsInView } from "./motion";
import { cn } from "@/lib/utils";

/**
 * Foydalar — 3D egiluvchi kartalar. Har biri "nima olasiz" tilida (natijaga yo'naltirilgan).
 */
const Benefits: React.FC = () => {
  const { t } = useTranslation();

  const items = [
    { Icon: Clock3, color: "bg-[var(--l-blue)] text-white", title: t("landing_page.b1_title"), desc: t("landing_page.b1_desc"), stat: "4", statLabel: t("landing_page.b1_stat") },
    { Icon: Video, color: "bg-[var(--l-ink)] text-[#bef264]", title: t("landing_page.b2_title"), desc: t("landing_page.b2_desc"), stat: "100%", statLabel: t("landing_page.b2_stat") },
    { Icon: ListChecks, color: "bg-[#bef264] text-[var(--l-ink)]", title: t("landing_page.b3_title"), desc: t("landing_page.b3_desc"), stat: "∞", statLabel: t("landing_page.b3_stat") },
    { Icon: ShieldCheck, color: "bg-white text-[var(--l-blue)] ring-1 ring-[var(--l-line)]", title: t("landing_page.b4_title"), desc: t("landing_page.b4_desc"), stat: "2 GB+", statLabel: t("landing_page.b4_stat") },
  ];

  return (
    <section id="features" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="kicker">{t("landing_page.benefits_kicker")}</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[var(--l-ink)] sm:text-5xl">
            <WordsInView text={t("landing_page.benefits_title_a")} /> <WordsInView text={t("landing_page.benefits_title_hl")} className="text-[var(--l-blue)]" />
          </h2>
          <p className="mt-4 text-lg text-[var(--l-muted)]">{t("landing_page.benefits_desc")}</p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ Icon, color, title, desc, stat, statLabel }, i) => (
            <FlipIn key={title} className="h-full" delay={i * 0.12} from={i % 2 === 0 ? "left" : "right"}>
              <Tilt3D max={7} scale={1.03} className="h-full">
                <article className="card-3d flex h-full flex-col rounded-3xl border border-[var(--l-line)] bg-white p-6">
                  <Depth z={30}>
                    <span className={cn("inline-grid h-12 w-12 place-items-center rounded-2xl", color)}>
                      <Icon className="h-6 w-6" />
                    </span>
                  </Depth>
                  <Depth z={20}>
                    <p className="mt-6 text-4xl font-black tracking-[-0.03em] text-[var(--l-ink)]">{stat}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--l-muted)]">{statLabel}</p>
                  </Depth>
                  <Depth z={10}>
                    <h3 className="mt-5 text-lg font-bold text-[var(--l-ink)]">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--l-muted)]">{desc}</p>
                  </Depth>
                </article>
              </Tilt3D>
            </FlipIn>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;

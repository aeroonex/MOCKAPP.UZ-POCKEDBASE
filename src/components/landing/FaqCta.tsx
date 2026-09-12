"use client";

import React from "react";
import { ArrowRight, MessageSquareText, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Reveal from "./Reveal";
import { ScaleIn, WordsInView } from "./motion";

/** E'tirozlarga javob — FAQ. */
export const Faq: React.FC = () => {
  const { t } = useTranslation();
  const items = [
    { q: t("landing_page.faq_q1"), a: t("landing_page.faq_a1") },
    { q: t("guide_dialog.rule3_title").replace(/:$/, ""), a: t("guide_dialog.rule3_text") },
    { q: t("guide_dialog.rule1_title").replace(/:$/, ""), a: t("guide_dialog.rule1_text") },
    { q: t("guide_dialog.rule2_title").replace(/:$/, ""), a: t("guide_dialog.rule2_text") },
    { q: t("landing_page.faq_q5"), a: t("landing_page.faq_a5") },
  ];

  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="kicker">{t("landing_page.nav_faq")}</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[var(--l-ink)] sm:text-5xl"><WordsInView text={t("landing_page.faq_title")} /></h2>
            <p className="mt-4 text-lg text-[var(--l-muted)]">{t("landing_page.faq_desc")}</p>
          </Reveal>
          <div className="lg:col-span-8">
            <Accordion type="single" collapsible className="space-y-3">
              {items.map((it, i) => (
                <Reveal key={i} delay={i * 0.08} distance={22} direction="left">
                  <AccordionItem
                    value={`q${i}`}
                    className="rounded-2xl border border-[var(--l-line)] bg-[var(--l-bg)] px-5 transition-colors data-[state=open]:bg-white data-[state=open]:shadow-[0_16px_40px_-24px_rgba(15,23,42,0.3)]"
                  >
                    <AccordionTrigger className="py-5 text-left text-base font-bold text-[var(--l-ink)] hover:no-underline [&>svg]:text-[var(--l-blue)]">
                      {it.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-[15px] leading-relaxed text-[var(--l-muted)]">{it.a}</AccordionContent>
                  </AccordionItem>
                </Reveal>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};

interface CtaProps {
  onTryGuest: () => void;
  busy: boolean;
}

/** Yakuniy chaqiriq — ko'k band, aloqa. */
export const FinalCta: React.FC<CtaProps> = ({ onTryGuest, busy }) => {
  const { t } = useTranslation();
  return (
    <section id="contact" className="scroll-mt-24 px-5 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <ScaleIn className="mx-auto max-w-7xl">
        <div className="cta-band relative overflow-hidden rounded-[2rem] px-6 py-14 text-white sm:px-12 sm:py-20">
          <div className="relative grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="text-3xl font-black tracking-[-0.03em] sm:text-5xl"><WordsInView text={t("landing_page.cta_title")} /></h2>
              <p className="mt-4 max-w-xl text-lg text-blue-100">{t("landing_page.cta_desc")}</p>
              <button type="button" onClick={onTryGuest} disabled={busy} className="btn-cta btn-cta-invert group mt-8">
                {t("landing_page.cta_free")}
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
            <div className="grid gap-3 lg:col-span-5">
              <a href="tel:+998772077117" className="cta-contact">
                <Phone className="h-5 w-5" />
                <span>
                  <span className="block text-xs text-blue-100">{t("landing_page.call_us")}</span>
                  <span className="block text-lg font-bold">+998 77 207 71 17</span>
                </span>
              </a>
              <a href="https://t.me/aero_one" target="_blank" rel="noopener noreferrer" className="cta-contact">
                <MessageSquareText className="h-5 w-5" />
                <span>
                  <span className="block text-xs text-blue-100">{t("landing_page.message_us")}</span>
                  <span className="block text-lg font-bold">Telegram · @aero_one</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </ScaleIn>
    </section>
  );
};

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <footer className="border-t border-[var(--l-line)] py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--l-blue)] text-sm font-black text-white">E</span>
          <span className="text-sm font-bold text-[var(--l-ink)]">Edumock.uz</span>
          <span className="text-sm text-slate-500">· {t("landing_page.footer_tagline")}</span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {[
            ["how", t("landing_page.nav_how")],
            ["features", t("landing_page.nav_features")],
            ["pricing", t("landing_page.nav_pricing")],
            ["faq", t("landing_page.nav_faq")],
            ["contact", t("landing_page.nav_contact")],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => go(id)} className="text-slate-600 transition-colors hover:text-[var(--l-ink)]">
              {label}
            </button>
          ))}
        </nav>
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} Edumock.uz</p>
      </div>
    </footer>
  );
};

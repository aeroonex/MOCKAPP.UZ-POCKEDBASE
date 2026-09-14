"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import CustomAuthForm from "@/components/CustomAuthForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import PricingCard from "@/components/PricingCard";
import { useAuth } from "@/context/AuthProvider";
import LandingHeader from "@/components/landing/LandingHeader";
import Hero from "@/components/landing/Hero";
import Benefits from "@/components/landing/Benefits";
import ExamSteps from "@/components/landing/ExamSteps";
import DarkBand from "@/components/landing/DarkBand";
import Reveal from "@/components/landing/Reveal";
import { Rise3D, WordsInView } from "@/components/landing/motion";
import ScrollPath from "@/components/landing/ScrollPath";
import { Faq, FinalCta, Footer } from "@/components/landing/FaqCta";

const Login: React.FC = () => {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [showGlobalSpinner, setShowGlobalSpinner] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();

  const openLoginModal = () => setIsLoginDialogOpen(true);
  const closeLoginModal = () => setIsLoginDialogOpen(false);
  const goPricing = () => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Mehmon rejimi — asosiy mantiq o'zgarmagan
  const handleTryMe = () => {
    setShowGlobalSpinner(true);
    setTimeout(() => {
      localStorage.setItem("isGuestMode", "true");
      sessionStorage.setItem("showGuestGuide", "true");
      navigate("/home");
      setShowGlobalSpinner(false);
    }, 900);
  };

  // Landing har doim yorug' ko'rinishda: ilova temasi (html.dark) vaqtincha o'chiriladi,
  // sahifadan chiqilganda tiklanadi. Saqlangan tema sozlamasi o'zgarmaydi.
  const { resolvedTheme } = useTheme();
  const resolvedRef = useRef(resolvedTheme);
  resolvedRef.current = resolvedTheme;

  useEffect(() => {
    const rootEl = document.documentElement;
    const forceLight = () => {
      if (rootEl.classList.contains("dark")) rootEl.classList.remove("dark");
      if (!rootEl.classList.contains("light")) rootEl.classList.add("light");
      if (rootEl.style.colorScheme !== "light") rootEl.style.colorScheme = "light";
    };
    forceLight();
    const observer = new MutationObserver(forceLight);
    observer.observe(rootEl, { attributes: true, attributeFilter: ["class", "style"] });
    return () => {
      observer.disconnect();
      rootEl.classList.remove("light");
      if (resolvedRef.current !== "light") {
        rootEl.classList.add("dark");
        rootEl.style.colorScheme = "dark";
      }
    };
  }, []);

  // Scroll bo'yicha fon rangining yumshoq o'zgarishi (oq → och ko'k → och binafsha → oq)
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const pageBg = useTransform(
    scrollYProgress,
    [0, 0.2, 0.38, 0.58, 0.8, 1],
    reduce ? ["#f6f7fb", "#f6f7fb", "#f6f7fb", "#f6f7fb", "#f6f7fb", "#f6f7fb"] : ["#f6f7fb", "#e9f1ff", "#f6f7fb", "#eaf6ff", "#f1eeff", "#f6f7fb"],
  );

  useEffect(() => {
    if (session) {
      setShowGlobalSpinner(true);
      const timer = setTimeout(() => {
        closeLoginModal();
        navigate("/home");
        setShowGlobalSpinner(false);
      }, 900);
      return () => clearTimeout(timer);
    }

    setShowGlobalSpinner(false);
    localStorage.removeItem("isGuestMode");
    sessionStorage.removeItem("guestWelcomeToastShown");
    sessionStorage.removeItem("showGuestGuide");
  }, [navigate, session]);

  return (
    <motion.div style={{ backgroundColor: pageBg }} className="landing min-h-screen text-[var(--l-ink)]">
      <LandingHeader onOpenLogin={openLoginModal} onTryGuest={handleTryMe} />

      <main>
        <Hero onTryGuest={handleTryMe} onOpenPricing={goPricing} busy={showGlobalSpinner} />
        <div className="relative">
        <ScrollPath sectionIds={["features", "how", "band", "pricing", "faq", "contact"]} />
        <Benefits />
        <ExamSteps />
        <DarkBand />

        {/* Tariflar — mavjud PricingCard (mantiq o'zgarmagan) */}
        <section id="pricing" className="scroll-mt-24 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-12">
              <Reveal className="lg:col-span-5">
                <p className="kicker">{t("landing_page.pricing_kicker")}</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[var(--l-ink)] sm:text-5xl"><WordsInView text={t("landing_page.select_tariff")} /></h2>
                <p className="mt-4 text-lg text-[var(--l-muted)]">{t("landing_page.pricing_desc")}</p>
                <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[var(--l-line)] bg-white p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#bef264] text-[var(--l-ink)]">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[var(--l-ink)]">{t("landing_page.guarantee_title")}</p>
                    <p className="mt-1 text-sm text-[var(--l-muted)]">{t("landing_page.guarantee_desc")}</p>
                  </div>
                </div>
                <ul className="mt-6 space-y-2.5 text-[15px] text-[var(--l-ink)]">
                  {["unlimited_attempts", "unlimited_downloads", "add_custom_questions", "support_service_24_7"].map((k) => (
                    <li key={k} className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-[var(--l-blue)]" />
                      {t(`landing_page.features.${k}`)}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <div className="lg:col-span-7">
                <Rise3D delay={0.1}>
                  <div className="pricing-wrap">
                    <PricingCard />
                  </div>
                </Rise3D>
              </div>
            </div>
          </div>
        </section>

        <Faq />
        <FinalCta onTryGuest={handleTryMe} busy={showGlobalSpinner} />
        </div>
      </main>

      <Footer />

      <Dialog open={isLoginDialogOpen} onOpenChange={closeLoginModal}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[425px] p-0 overflow-hidden rounded-2xl border border-[var(--l-line)] bg-white text-[var(--l-ink)] shadow-2xl">
          <div className="h-1.5 w-full bg-[var(--l-blue)]" />
          <div className="p-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-black tracking-tight">{t("common.welcome")}</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">{t("common.auth_description")}</DialogDescription>
            </DialogHeader>
            <CustomAuthForm />
            <div className="mt-6 border-t border-[var(--l-line)] pt-4 text-xs text-slate-500">
              <p className="leading-relaxed">{t("common.forgot_password_contact_admin_message")}</p>
              <a href="tel:+998505716515" className="mt-1 inline-block font-bold text-[var(--l-blue)] underline-offset-4 hover:underline">
                {t("common.admin_contact_phone")}
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {showGlobalSpinner && <LoadingSpinner />}
    </motion.div>
  );
};

export default Login;

"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { ScrollProgress } from "./motion";

interface LandingHeaderProps {
  onOpenLogin: () => void;
  onTryGuest: () => void;
}

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

/** Sarlavha: tepada shaffof, scroll'da oq fon + progress chizig'i. */
const LandingHeader: React.FC<LandingHeaderProps> = ({ onOpenLogin, onTryGuest }) => {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    { id: "features", label: t("landing_page.nav_features") },
    { id: "how", label: t("landing_page.nav_how") },
    { id: "pricing", label: t("landing_page.nav_pricing") },
    { id: "faq", label: t("landing_page.nav_faq") },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-200",
        scrolled ? "border-[var(--l-line)] bg-white/92 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)]" : "border-transparent bg-transparent",
      )}
    >
      {scrolled && <ScrollProgress />}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="group flex items-center gap-2.5"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--l-blue)] text-sm font-black text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.8)] transition-transform duration-300 group-hover:-rotate-6">
            M
          </span>
          <span className="text-[17px] font-black tracking-tight text-[var(--l-ink)]">
            Mockapp<span className="text-[var(--l-blue)]">.uz</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className="whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-[var(--l-bg)] hover:text-[var(--l-ink)]"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button type="button" onClick={onOpenLogin} className="btn-ghost h-9 px-4 text-sm">
            {t("common.login")}
          </button>
          <button type="button" onClick={onTryGuest} className="btn-cta hidden h-9 px-4 text-sm sm:inline-flex">
            {t("landing_page.cta_free_short")}
          </button>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;

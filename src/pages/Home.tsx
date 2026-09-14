"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, PlusCircle, ListChecks, Video, ClipboardList, Settings as SettingsIcon, User as UserIcon, Home as HomeIcon, LogOut, Info, Send, PenLine } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthProvider";
import { useTranslation } from 'react-i18next';
import GuideDialog from "@/components/GuideDialog";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { isStationHost, stationCenterName } from "@/lib/station";

interface HomeProps {
  setIsGuideDialogOpen: (isOpen: boolean) => void;
  handleLogout: () => void;
  isGuideDialogOpen: boolean; // Yangi: isGuideDialogOpen prop'ini qo'shish
}

export default function Home({ setIsGuideDialogOpen, handleLogout, isGuideDialogOpen }: HomeProps) { // Prop'lar qabul qilindi
  const navigate = useNavigate();
  const { session } = useAuth();
  const station = isStationHost();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true" && !station;
  const { t } = useTranslation();
  const isMobile = useIsMobile(); // Use the hook

  useEffect(() => {
    const welcomeToastShown = sessionStorage.getItem("guestWelcomeToastShown") === "true";

    if (isGuestMode && !session && !welcomeToastShown) {
      toast.info(t("landing_page.guest_mode_welcome"));
      sessionStorage.setItem("guestWelcomeToastShown", "true");
    }

    const shouldShowGuide = sessionStorage.getItem("showGuestGuide") === "true";
    if (isGuestMode && shouldShowGuide) {
      setIsGuideDialogOpen(true);
      sessionStorage.removeItem("showGuestGuide");
    }
  }, [isGuestMode, session, t, setIsGuideDialogOpen]);

  // Piramida: tepada asosiy amal (Mock Test), pastda 4 ta yordamchi bo'lim — har biri o'z rangi bilan
  const hero = {
    icon: <ListChecks className="w-12 h-12 sm:w-16 sm:h-16" />,
    title: t("home_page.mock_test"),
    subtitle: t("home_page.start_the_test"),
    path: "/mock-test",
  };
  const allItems = [
    {
      icon: <Book className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: t("home_page.questions"),
      subtitle: t("home_page.view_all_questions"),
      path: "/questions",
      accent: "from-sky-500/30 to-sky-500/0 text-sky-300 hover:border-sky-400/60 hover:shadow-sky-500/30",
    },
    {
      icon: <PlusCircle className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: t("home_page.add_question"),
      subtitle: t("home_page.add_new_question"),
      path: "/add-question",
      accent: "from-emerald-500/30 to-emerald-500/0 text-emerald-300 hover:border-emerald-400/60 hover:shadow-emerald-500/30",
    },
    {
      icon: <ClipboardList className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: t("home_page.registrations"),
      subtitle: t("home_page.view_registrations"),
      path: "/registrations",
      accent: "from-amber-500/30 to-amber-500/0 text-amber-300 hover:border-amber-400/60 hover:shadow-amber-500/30",
    },
    {
      icon: <Video className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: t("home_page.records"),
      subtitle: t("home_page.view_recorded_videos"),
      path: "/records",
      accent: "from-rose-500/30 to-rose-500/0 text-rose-300 hover:border-rose-400/60 hover:shadow-rose-500/30",
    },
    {
      icon: <PenLine className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: t("writing.title"),
      subtitle: t("writing.home_subtitle"),
      path: "/writing",
      accent: "from-violet-500/30 to-violet-500/0 text-violet-300 hover:border-violet-400/60 hover:shadow-violet-500/30",
    },
  ];
  // Stansiyada: Savollar, Savol qo'shish, Yozuvlar (Mock Test tepada); Ro'yxat — faqat asosiy saytda
  const items = station ? allItems.filter((i) => i.path !== "/registrations") : allItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-sky-500 to-slate-900 text-white p-4 pb-24 sm:pb-4">
      <header className="flex flex-col sm:flex-row sm:justify-between items-center mb-8">
        <h1 className="text-xl sm:text-3xl font-bold">Edumock.uz</h1>

        {!isMobile && ( // Only show header nav on non-mobile
          <nav className="flex flex-row flex-wrap justify-center sm:justify-end gap-x-2 gap-y-1 text-xs items-center mt-4 sm:mt-0">
            <Button asChild variant="ghost" className="h-7 px-2 flex items-center gap-1 text-white rounded-md hover:bg-white/10 hover:text-indigo-300">
              <Link to="/home">
                <HomeIcon className="h-3 w-3" /> {t("common.home")}
              </Link>
            </Button>
            {!station && (
              <>
                <Button asChild variant="ghost" className="h-7 px-2 flex items-center gap-1 text-white rounded-md hover:bg-white/10 hover:text-indigo-300">
                  <Link to="/settings">
                    <SettingsIcon className="h-3 w-3" /> {t("common.settings")}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="h-7 px-2 flex items-center gap-1 text-white rounded-md hover:bg-white/10 hover:text-indigo-300">
                  <Link to="/user-profile">
                    <UserIcon className="h-3 w-3" /> {t("common.profile")}
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="h-7 px-2 flex items-center gap-1 text-white rounded-md hover:bg-white/10 hover:text-indigo-300"
                  onClick={() => setIsGuideDialogOpen(true)}
                >
                  <Info className="h-3 w-3" /> {t("common.guide")}
                </Button>
              </>
            )}
            {(session || isGuestMode) && (
              <Button asChild variant="ghost" className="h-7 px-2 flex items-center gap-1 text-white rounded-md hover:bg-white/10 hover:text-red-300">
                <Link to="/login" onClick={handleLogout}>
                  <LogOut className="h-3 w-3" /> {isGuestMode && !session ? t("common.guest_mode_exit") : t("common.logout")}
                </Link>
              </Button>
            )}
          </nav>
        )}
      </header>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-3xl sm:text-5xl font-bold text-center mb-1 drop-shadow-md">{station ? t("station.title") : t("home_page.speaking_platform")}</h2>
        <p className="text-sm sm:text-base text-center text-slate-200 mb-4">{station ? `${stationCenterName() || "CEFR"} · ${t("station.home_hint")}` : t("home_page.welcome_dashboard")}</p>
      </motion.div>

      <div className="max-w-6xl mx-auto mt-8 sm:mt-14 space-y-5 sm:space-y-8">
        {/* Tepada — asosiy amal: Mock Test (katta, markazda) */}
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }} className="flex justify-center">
          <Link to={hero.path} className="w-full sm:w-[34rem]">
            <div className="group relative">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 opacity-60 blur-lg transition-all duration-700 group-hover:opacity-100 group-hover:blur-xl" />
              <Card className="relative bg-slate-950/85 border border-white/25 rounded-3xl shadow-2xl transition-all duration-500 group-hover:-translate-y-1 cursor-pointer overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300" />
                <CardContent className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 p-6 sm:p-8">
                  <div className="h-20 w-20 sm:h-28 sm:w-28 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-2">
                    {hero.icon}
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <div className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-indigo-300 mb-1">CEFR · Speaking</div>
                    <h3 className="text-2xl sm:text-4xl font-extrabold leading-tight">{hero.title}</h3>
                    <p className="text-sm sm:text-base text-slate-300 mt-1 mb-4">{hero.subtitle}</p>
                    <Button className="bg-white text-slate-900 hover:bg-indigo-100 font-bold px-6 py-2 rounded-xl shadow-lg transition-all duration-300 hover:scale-105">
                      {t("home_page.start_the_test")} →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Link>
        </motion.div>

        {/* Pastda — 4 ta bo'lim, har biri o'z rangida (stansiyada faqat Yozuvlar) */}
        <div className={station ? "grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 max-w-4xl mx-auto" : "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6"}>
          {items.map((item, index) => (
            <motion.div key={item.path} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + index * 0.08 }} >
              <Link to={item.path}>
                <Card className={`group relative overflow-hidden bg-slate-900/70 border border-white/20 rounded-2xl shadow-xl hover:scale-[1.04] hover:shadow-2xl transition-all duration-500 cursor-pointer ${item.accent}`}>
                  <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${item.accent.split(" ").slice(0, 2).join(" ")} opacity-70`} />
                  <CardContent className="relative flex flex-col items-center text-center p-4 sm:p-6">
                    <div className="mb-3 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{item.icon}</div>
                    <h3 className="text-base sm:text-xl font-bold mb-1 text-white">{item.title}</h3>
                    <p className="text-[11px] sm:text-sm text-slate-300 mb-3 min-h-[2.5rem]">{item.subtitle}</p>
                    <Button size="sm" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white rounded-xl transition-all duration-300 group-hover:scale-105">
                      {t("common.open")}
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <footer className="mt-10 sm:mt-20 text-center text-slate-200 opacity-90">
        <a
          href="https://t.me/aero_one"
          target="_blank"
          rel="noreferrer"
          className="inline-flex justify-center items-center gap-2 text-sky-300 hover:text-sky-400 transition-all duration-300 mt-4"
        >
          <Send className="h-5 w-5" />
          <span className="font-medium">Telegram</span>
        </a>

        <p className="text-base sm:text-lg mt-4">{t("landing_page.contact_us")}: <span className="font-bold text-white">{t("landing_page.phone_number")}</span></p>
        <p className="text-xs sm:text-sm mt-1 text-slate-300">{t("landing_page.support_service")}</p>
      </footer>

      <GuideDialog isOpen={isGuideDialogOpen} onClose={() => setIsGuideDialogOpen(false)} />
    </div>
  );
}
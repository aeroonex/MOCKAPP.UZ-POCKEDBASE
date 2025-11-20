"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, PlusCircle, ListChecks, Video, Settings as SettingsIcon, User as UserIcon, Home as HomeIcon, LogOut, Info, Send } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from 'react-i18next';
import GuideDialog from "@/components/GuideDialog";
import { toast } from "sonner";

export default function Home() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true";
  const { t } = useTranslation();
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);

  useEffect(() => {
    if (isGuestMode && !session) {
      toast.info(t("landing_page.guest_mode_welcome"));
    }
  }, [isGuestMode, session, t]);

  const handleLogout = async () => {
    if (session) {
      await supabase.auth.signOut();
      showSuccess(t("common.success_logged_in"));
    } else if (isGuestMode) {
      localStorage.removeItem("isGuestMode");
      showSuccess(t("common.success_guest_mode_exited"));
    }
    navigate("/login");
  };

  const items = [
    {
      icon: <Book className="w-10 h-10" />,
      title: t("home_page.questions"),
      subtitle: t("home_page.view_all_questions"),
      path: "/questions",
    },
    {
      icon: <PlusCircle className="w-10 h-10" />,
      title: t("home_page.add_question"),
      subtitle: t("home_page.add_new_question"),
      path: "/add-question",
    },
    {
      icon: <ListChecks className="w-10 h-10" />,
      title: t("home_page.mock_test"),
      subtitle: t("home_page.start_the_test"),
      path: "/mock-test",
    },
    {
      icon: <Video className="w-10 h-10" />,
      title: t("home_page.records"),
      subtitle: t("home_page.view_recorded_videos"),
      path: "/records",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-sky-500 to-slate-900 text-white p-4">
      <header className="flex flex-col sm:flex-row sm:justify-between items-center mb-8">
        <h1 className="text-xl sm:text-3xl font-bold">Edumock.uz</h1>
        <nav className="flex flex-col items-start gap-2 text-xs mt-4 sm:mt-0">
          <Link to="/home" className="hover:text-indigo-300 flex items-center justify-center gap-1 py-0.5 px-2 rounded-md hover:bg-white/10 border border-white/30">
            <HomeIcon className="h-3 w-3" /> {t("common.home")}
          </Link>
          <Link to="/settings" className="hover:text-indigo-300 flex items-center justify-center gap-1 py-0.5 px-2 rounded-md hover:bg-white/10 border border-white/30">
            <SettingsIcon className="h-3 w-3" /> {t("common.settings")}
          </Link>
          <Link to="/user-profile" className="hover:text-indigo-300 flex items-center justify-center gap-1 py-0.5 px-2 rounded-md hover:bg-white/10 border border-white/30">
            <UserIcon className="h-3 w-3" /> {t("common.profile")}
          </Link>
          <Button 
            variant="ghost" 
            className="hover:text-indigo-300 flex items-center justify-center gap-1 text-white py-0.5 px-2 rounded-md hover:bg-white/10 border border-white/30" 
            onClick={() => setIsGuideDialogOpen(true)}
          >
            <Info className="h-3 w-3" /> {t("common.guide")}
          </Button>
          {(session || isGuestMode) && (
            <Link to="/login" onClick={handleLogout} className="hover:text-red-300 flex items-center justify-center gap-1 py-0.5 px-2 rounded-md hover:bg-white/10 border border-white/30">
              <LogOut className="h-3 w-3" /> {isGuestMode && !session ? t("common.guest_mode_exit") : t("common.logout")}
            </Link>
          )}
        </nav>
      </header>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-3xl sm:text-5xl font-bold text-center mb-1 drop-shadow-md">{t("home_page.speaking_platform")}</h2>
        <p className="text-sm sm:text-base text-center text-slate-200 mb-4">{t("home_page.welcome_dashboard")}</p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 max-w-6xl mx-auto mt-8 sm:mt-16">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={item.path}>
              <Card className="group bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-xl hover:scale-105 hover:border-indigo-400/50 hover:shadow-indigo-500/40 hover:shadow-2xl transition-all duration-500 cursor-pointer">
                <CardContent className="flex flex-col items-center text-center p-4 sm:p-8">
                  <div className="mb-4 text-indigo-300 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]">{item.icon}</div>
                  <h3 className="text-lg sm:text-2xl font-bold mb-2">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-700 mb-4">{item.subtitle}</p>
                  <Button className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1 sm:px-6 sm:py-2 rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-105">{t("common.open")}</Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
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
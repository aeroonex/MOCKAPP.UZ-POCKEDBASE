"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, PlusCircle, ListChecks, Video, Settings as SettingsIcon, User as UserIcon, Home as HomeIcon, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from 'react-i18next';

export default function Home() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true";
  const { t } = useTranslation();

  const handleLogout = async () => {
    if (session) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("isGuestMode");
    showSuccess(t("common.success_logged_in"));
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-sky-500 to-slate-900 text-white p-6">
      <header className="flex justify-between items-center mb-16">
        <h1 className="text-3xl font-bold">Edumock.uz</h1>
        <nav className="flex gap-6 text-lg">
          <Link to="/home" className="hover:text-indigo-300 flex items-center gap-1">
            <HomeIcon className="h-4 w-4" /> {t("common.home")}
          </Link>
          <Link to="/settings" className="hover:text-indigo-300 flex items-center gap-1">
            <SettingsIcon className="h-4 w-4" /> {t("common.settings")}
          </Link>
          <Link to="/user-profile" className="hover:text-indigo-300 flex items-center gap-1">
            <UserIcon className="h-4 w-4" /> {t("common.profile")}
          </Link>
          {(session || isGuestMode) && (
            <Link to="/login" onClick={handleLogout} className="hover:text-red-300 flex items-center gap-1">
              <LogOut className="h-4 w-4" /> {isGuestMode && !session ? t("common.guest_mode_exit") : t("common.logout")}
            </Link>
          )}
        </nav>
      </header>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-5xl font-bold text-center mb-3 drop-shadow-md">{t("home_page.speaking_platform")}</h2>
        <p className="text-center text-slate-200 mb-16">{t("home_page.welcome_dashboard")}</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={item.path}>
              <Card className="group bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-xl hover:scale-105 hover:border-indigo-400/50 hover:shadow-indigo-500/40 hover:shadow-2xl transition-all duration-500 cursor-pointer">
                <CardContent className="flex flex-col items-center text-center p-8">
                  <div className="mb-4 text-indigo-300 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]">{item.icon}</div>
                  <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-300 mb-4">{item.subtitle}</p>
                  <Button className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-105">{t("common.open")}</Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <footer className="mt-20 text-center text-slate-200 opacity-90">
        <a
          href="https://t.me/aero_one"
          target="_blank"
          rel="noreferrer"
          className="inline-flex justify-center items-center gap-2 text-sky-300 hover:text-sky-400 transition-all duration-300 mt-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M9.999 15.17 9.965 18c.445 0 .638-.191.871-.419l2.086-1.99 4.322 3.166c.793.44 1.36.209 1.568-.737l2.837-13.27.001-.002c.252-1.178-.425-1.64-1.21-1.35L2.932 9.23c-1.164.453-1.147 1.103-.21 1.397l4.993 1.558 11.6-7.27c.545-.33 1.045-.147.635.183" />
          </svg>
          <span className="font-medium">@aero_one</span>
        </a>

        <p className="text-lg mt-4">{t("landing_page.contact_us")}: <span className="font-bold text-white">{t("landing_page.phone_number")}</span></p>
        <p className="text-sm mt-1 text-slate-300">{t("landing_page.support_service")}</p>
      </footer>
    </div>
  );
}
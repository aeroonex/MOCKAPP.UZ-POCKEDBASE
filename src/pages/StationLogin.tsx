"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { KeyRound, ListChecks, Loader2, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import { stationLogin } from "@/lib/station";
import { showError, showSuccess } from "@/utils/toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/** cefr.edumock.uz — imtihon stansiyasiga faqat parol bilan kirish */
const StationLogin: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate("/home", { replace: true });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setBusy(true);
    try {
      const res = await stationLogin(password);
      showSuccess(`${t("station.welcome")} — ${res.station.center_name || "CEFR"}`);
      navigate("/home", { replace: true });
    } catch (err) {
      showError(err instanceof Error && err.message !== "Invalid password" ? err.message : t("station.wrong_password"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-sky-600 to-slate-900 p-4">
      <div className="absolute top-4 right-4 text-white">
        <LanguageSwitcher />
      </div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="text-center text-white mb-6">
          <div className="text-xs uppercase tracking-[0.3em] text-sky-200">CEFR · Speaking</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">{t("station.title")}</h1>
          <p className="text-sky-100 mt-2 text-sm">{t("station.subtitle")}</p>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-slate-950/80 border border-white/20 shadow-2xl p-6 sm:p-8 space-y-5 backdrop-blur">
          <div className="flex justify-center gap-6 text-sky-200">
            <div className="flex flex-col items-center gap-1 text-xs">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg">
                <ListChecks className="h-6 w-6" />
              </div>
              {t("home_page.mock_test")}
            </div>
            <div className="flex flex-col items-center gap-1 text-xs">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center shadow-lg">
                <Video className="h-6 w-6" />
              </div>
              {t("home_page.records")}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="station-password" className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {t("station.password_label")}
            </label>
            <Input
              id="station-password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 text-lg bg-slate-900 border-white/20 text-white placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-400">{t("station.password_hint")}</p>
          </div>

          <Button type="submit" disabled={busy || !password.trim()} className="w-full h-12 text-base font-bold bg-white text-slate-900 hover:bg-indigo-100 rounded-xl">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t("station.enter")}
          </Button>
        </form>

        <p className="text-center text-xs text-sky-100/80 mt-4">
          edumock.uz · {t("station.footer")}
        </p>
      </motion.div>
    </div>
  );
};

export default StationLogin;

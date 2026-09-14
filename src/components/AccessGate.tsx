"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { AlertTriangle, CreditCard, Lock, LogOut, ShieldBan, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthProvider";
import { auth } from "@/lib/api";
import { billingApi, formatSum, getAccess } from "@/lib/billing";
import { isStationHost } from "@/lib/station";
import { cn } from "@/lib/utils";

/** Sozlamalar (to'lov) sahifasi qulflanmaydi */
const OPEN_PATHS = ["/settings", "/login", "/"];

/**
 * Obuna darvozasi:
 *  · muddat tugashiga N kun qolganda — sariq eslatma banneri (To'lov qilish tugmasi bilan)
 *  · muddat tugagan yoki bloklangan — sahifa kulrang/nofaol, bosilsa chiroyli popup
 */
export const useAccessState = () => {
  const { user } = useAuth();
  const isDev = user?.role === "developer";
  const infoQ = useQuery({
    queryKey: ["billing-info"],
    queryFn: billingApi.info,
    enabled: !!user && !isDev,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const remindDays = infoQ.data?.settings.remind_days ?? 5;
  // Server ma'lumoti yangiroq (tasdiqlangandan keyin darhol), bo'lmasa lokal foydalanuvchidan
  const access = useMemo(() => infoQ.data?.access ?? getAccess(user, remindDays), [infoQ.data, user, remindDays]);
  return { user, access, info: infoQ.data, isDev };
};

/** Sahifa mazmuni qulflanganda yopish uchun — AppContent ishlatadi */
export const useIsLocked = () => {
  const { user, access } = useAccessState();
  const location = useLocation();
  const onOpenPath = OPEN_PATHS.some((p) => (p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)));
  return !!user && !access.active && !onOpenPath;
};

const AccessGate: React.FC = () => {
  const { t } = useTranslation();
  const { user, access, info } = useAccessState();
  const navigate = useNavigate();
  const location = useLocation();
  const station = isStationHost();
  const [popup, setPopup] = useState(false);

  const onOpenPath = OPEN_PATHS.some((p) => (p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)));
  const locked = !!user && !access.active && !onOpenPath;

  // API 402 qaytarsa ham popup
  useEffect(() => {
    const h = () => setPopup(true);
    window.addEventListener("edumock:locked", h);
    return () => window.removeEventListener("edumock:locked", h);
  }, []);

  // Qulflangan sahifaga kirilganda popup avtomatik ochiladi
  useEffect(() => {
    if (locked) setPopup(true);
  }, [locked, location.pathname]);

  const goPay = useCallback(() => {
    setPopup(false);
    navigate("/settings?s=billing");
  }, [navigate]);

  const logout = () => {
    auth.clear();
    setPopup(false);
    navigate(station ? "/" : "/login");
  };

  if (!user) return null;
  const amount = info?.settings.amount ?? 0;
  const until = access.paid_until ? format(new Date(access.paid_until), "dd.MM.yyyy") : "";

  return (
    <>
      {/* Eslatma banneri */}
      {access.active && access.remind && !station && (
        <div className="sticky top-0 z-40 bg-amber-400 text-slate-900 shadow-md">
          <div className="container mx-auto px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="flex-1 min-w-[200px]">
              {t("billing.remind_banner", { date: until, days: access.days_left ?? 0 })}
            </span>
            <Button size="sm" className="bg-slate-900 text-amber-300 hover:bg-slate-800 font-bold gap-1" onClick={goPay}>
              <CreditCard className="h-4 w-4" />
              {t("billing.pay_now")}
            </Button>
          </div>
        </div>
      )}

      {/* Qulf: shaffof qatlam — har qanday bosish popup ochadi */}
      {locked && (
        <div
          className="fixed inset-0 z-[45] cursor-pointer"
          onClick={() => setPopup(true)}
          role="presentation"
          aria-hidden="true"
        />
      )}

      <Dialog open={locked && popup} onOpenChange={(o) => !o && setPopup(false)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-md rounded-3xl p-0 overflow-hidden border-0 shadow-2xl [&>button]:text-white">
          <div className={cn("relative px-8 pt-10 pb-8 text-white text-center", access.blocked ? "bg-gradient-to-br from-rose-600 via-red-600 to-orange-500" : "bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600")}>
            <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_30%_20%,white,transparent_45%)]" />
            <div className="relative mx-auto h-20 w-20 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-1 ring-white/30">
              {access.blocked ? <ShieldBan className="h-10 w-10" /> : <Lock className="h-10 w-10" />}
            </div>
            <DialogTitle className="relative mt-5 text-2xl font-extrabold tracking-tight">
              {access.blocked ? t("billing.locked_blocked_title") : t("billing.locked_expired_title")}
            </DialogTitle>
            <DialogDescription className="relative mt-2 text-white/85 text-sm leading-relaxed">
              {station
                ? t("billing.locked_station_desc")
                : access.blocked
                  ? t("billing.locked_blocked_desc")
                  : t("billing.locked_expired_desc")}
            </DialogDescription>
          </div>
          <div className="bg-background px-8 py-6 space-y-4">
            {!station && !access.blocked && amount > 0 && (
              <div className="flex items-center justify-between rounded-2xl border bg-muted/40 px-4 py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" /> {t("billing.plan_price")}</span>
                <span className="text-xl font-black">{formatSum(amount)} <span className="text-sm font-semibold text-muted-foreground">{t("billing.sum")}</span></span>
              </div>
            )}
            {until && !access.blocked && (
              <p className="text-center text-xs text-muted-foreground">{t("billing.expired_on", { date: until })}</p>
            )}
            <div className="flex flex-col gap-2">
              {!station && !access.blocked && (
                <Button onClick={goPay} className="h-12 text-base font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 text-white shadow-lg shadow-indigo-500/30 gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t("billing.pay_now")}
                </Button>
              )}
              {!station && access.blocked && (
                <Button onClick={goPay} variant="outline" className="h-11 rounded-xl gap-2">
                  <CreditCard className="h-4 w-4" />
                  {t("billing.contact_admin")}
                </Button>
              )}
              <Button variant="ghost" onClick={logout} className="text-muted-foreground gap-2">
                <LogOut className="h-4 w-4" />
                {t("common.logout")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AccessGate;

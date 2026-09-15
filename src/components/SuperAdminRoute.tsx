"use client";

import React, { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useProfile } from "@/hooks/use-profile";
import { useTranslation } from 'react-i18next';
import { showError } from "@/utils/toast";

const SuperAdminRoute: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { t } = useTranslation();

  const loading = authLoading || profileLoading;
  const denied = !loading && !!session && profile?.role !== "developer";
  // Toast render ichida emas — effektda (aks holda ikki marta ko'rinadi)
  useEffect(() => {
    if (denied) showError(t("common.admin_only"));
  }, [denied, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  // 1. Tizimga kirmagan bo'lsa, login sahifasiga yuborish
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 2. Profil ma'lumotlari yuklanganidan keyin rolni tekshirish
  const isSuperAdmin = profile?.role === 'developer';

  if (isSuperAdmin) {
    return <Outlet />;
  }
  // Tizimga kirgan, lekin superadmin emas — bosh sahifaga (ogohlantirish yuqoridagi effektda)
  return <Navigate to="/home" replace />;
};

export default SuperAdminRoute;
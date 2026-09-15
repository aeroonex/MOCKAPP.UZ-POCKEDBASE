"use client";

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { isStationHost } from "@/lib/station";
import { useTranslation } from "react-i18next";

const ProtectedRoute: React.FC = () => {
  const { session, loading } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true" && !isStationHost();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (session || isGuestMode) {
    return (
      <>
        <Outlet />
        {/* NetworkStatusFooter endi AppFooter ichida */}
      </>
    );
  }

  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
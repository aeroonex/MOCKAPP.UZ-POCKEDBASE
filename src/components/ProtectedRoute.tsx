"use client";

import React, { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import NetworkStatusFooter from "./NetworkStatusFooter";
import { showError } from "@/utils/toast";
import i18n from '@/i18n';

const ProtectedRoute: React.FC = () => {
  const { session, loading, isBlocked } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true";

  useEffect(() => {
    if (!loading && session && isBlocked) {
      showError(i18n.t("common.error_account_blocked"));
    }
  }, [loading, session, isBlocked]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-xl text-muted-foreground">Yuklanmoqda...</p>
      </div>
    );
  }

  if ((session && !isBlocked) || isGuestMode) {
    return (
      <>
        <Outlet />
        <NetworkStatusFooter />
      </>
    );
  }

  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
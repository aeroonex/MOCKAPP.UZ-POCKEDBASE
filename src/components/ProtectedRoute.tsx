"use client";

import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"; // Import useLocation and useNavigate
import { useAuth } from "@/context/AuthProvider";
import NetworkStatusFooter from "./NetworkStatusFooter";
import { showError } from "@/utils/toast";
import i18n from '@/i18n';
import { supabase } from "@/integrations/supabase/client"; // Import supabase to sign out if blocked

const ProtectedRoute: React.FC = () => {
  const { session, loading, isBlocked, isSuperAdmin } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true";
  const location = useLocation();
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    if (!loading && session && isBlocked) {
      showError(i18n.t("common.error_account_blocked"));
      // If blocked, sign out and redirect to login
      supabase.auth.signOut();
      navigate("/login", { replace: true });
    }
  }, [loading, session, isBlocked, navigate]); // Add navigate to dependencies

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-xl text-muted-foreground">Yuklanmoqda...</p>
      </div>
    );
  }

  // If authenticated and not blocked
  if (session && !isBlocked) {
    // Admin-specific redirection
    if (location.pathname === "/admin-dashboard" && !isSuperAdmin) {
      showError(i18n.t("admin_dashboard.error_access_denied"));
      return <Navigate to="/home" replace />;
    }
    // If user is super admin and tries to access /login, redirect to /admin-dashboard
    if (isSuperAdmin && location.pathname === "/login") {
      return <Navigate to="/admin-dashboard" replace />;
    }
    // If user is authenticated (teacher) and tries to access /login, redirect to /home
    if (!isSuperAdmin && location.pathname === "/login") {
      return <Navigate to="/home" replace />;
    }
    
    return (
      <>
        <Outlet />
        <NetworkStatusFooter />
      </>
    );
  }

  // If in guest mode
  if (isGuestMode) {
    // If guest tries to access /login, redirect to /home
    if (location.pathname === "/login") {
      return <Navigate to="/home" replace />;
    }
    return (
      <>
        <Outlet />
        <NetworkStatusFooter />
      </>
    );
  }

  // If not authenticated, not blocked, and not in guest mode, redirect to login
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
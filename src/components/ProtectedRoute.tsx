"use client";

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { isStationHost } from "@/lib/station";

const ProtectedRoute: React.FC = () => {
  const { session, loading } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true" && !isStationHost();
  const isMobile = useIsMobile(); // Use the hook

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-xl text-muted-foreground">Yuklanmoqda...</p>
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
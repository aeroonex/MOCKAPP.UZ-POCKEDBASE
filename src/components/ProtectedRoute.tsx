"use client";

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import NetworkStatusFooter from "./NetworkStatusFooter";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

const ProtectedRoute: React.FC = () => {
  const { session, loading } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true";
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
        {!isMobile && <NetworkStatusFooter />} {/* Conditionally render NetworkStatusFooter */}
      </>
    );
  }

  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
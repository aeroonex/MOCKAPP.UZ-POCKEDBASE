"use client";

import React, { useState, lazy, Suspense } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthProvider";
import { showSuccess } from "@/utils/toast";
import { auth } from "@/lib/api";

import Login from "@/pages/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import SuperAdminRoute from "@/components/SuperAdminRoute";
import LanguageBackground from "@/components/LanguageBackground";
import MobileBottomNavbar from "@/components/MobileBottomNavbar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { isEduAiConfigured } from "@/lib/eduai";
import { cn } from "@/lib/utils";

// Sahifalar kerak bo'lganda yuklanadi — boshlang'ich bundle kichik va tez ochiladi.
const Home = lazy(() => import("@/pages/Home"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const MoodJournal = lazy(() => import("@/pages/MoodJournal"));
const AddQuestion = lazy(() => import("@/pages/AddQuestion"));
const MockTest = lazy(() => import("@/pages/MockTest"));
const Settings = lazy(() => import("@/pages/Settings"));
const UserProfile = lazy(() => import("@/pages/UserProfile"));
const Questions = lazy(() => import("@/pages/Questions"));
const Records = lazy(() => import("@/pages/Records"));
const SuperAdminDashboard = lazy(() => import("@/pages/SuperAdminDashboard"));
const EduAiAssistant = lazy(() => import("@/components/EduAiAssistant"));

const AppContent: React.FC = () => {
  const [isEduAiAssistantOpen, setIsEduAiAssistantOpen] = useState(false);
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isMockTestPage = location.pathname === "/mock-test";
  const isMobile = useIsMobile();
  const { session } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true";

  const handleLogout = async () => {
    if (session) {
      auth.clear();
      showSuccess(t("common.logout"));
    } else if (isGuestMode) {
      localStorage.removeItem("isGuestMode");
      sessionStorage.removeItem("guestWelcomeToastShown");
      showSuccess(t("common.success_guest_mode_exited"));
    }
    navigate("/login");
  };

  return (
    <div
      className={cn(
        "pb-10 bg-background text-foreground min-h-screen relative",
        isMobile && "pb-[calc(5rem+env(safe-area-inset-bottom))]",
      )}
    >
      {!isMockTestPage && <LanguageBackground />}

      <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mock-test" element={<MockTest />} />

        <Route element={<SuperAdminRoute />}>
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route
            path="/home"
            element={
              <Home
                setIsGuideDialogOpen={setIsGuideDialogOpen}
                handleLogout={handleLogout}
                isGuideDialogOpen={isGuideDialogOpen}
              />
            }
          />
          <Route path="/add-question" element={<AddQuestion />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/user-profile" element={<UserProfile />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/records" element={<Records />} />
          <Route path="/mood-journal" element={<MoodJournal />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>

      {isEduAiConfigured && !isMockTestPage && !isMobile && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="fixed bottom-4 right-4 z-[9999]"
        >
          <Button
            variant="default"
            className="h-14 px-6 rounded-full shadow-lg bg-gradient-purple text-white transition-all duration-300 animate-button-pulse btn-hover-glow flex items-center justify-center"
            onClick={() => setIsEduAiAssistantOpen(true)}
            aria-label={t("eduai_assistant.open_assistant")}
          >
            <span className="text-lg font-semibold">{t("eduai_assistant.chat_button_label")}</span>
          </Button>
        </motion.div>
      )}

      {isEduAiConfigured && isEduAiAssistantOpen && (
        <Suspense fallback={null}>
          <EduAiAssistant isOpen={isEduAiAssistantOpen} onClose={() => setIsEduAiAssistantOpen(false)} />
        </Suspense>
      )}

      <MobileBottomNavbar
        handleLogout={handleLogout}
        setIsGuideDialogOpen={setIsGuideDialogOpen}
        isGuestMode={isGuestMode}
        session={session}
      />
    </div>
  );
};

export default AppContent;
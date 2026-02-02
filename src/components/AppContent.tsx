"use client";

import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess } from "@/utils/toast";

import NotFound from "@/pages/NotFound";
import MoodJournal from "@/pages/MoodJournal";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import AddQuestion from "@/pages/AddQuestion";
import MockTest from "@/pages/MockTest";
import Settings from "@/pages/Settings";
import UserProfile from "@/pages/UserProfile";
import Questions from "@/pages/Questions";
import Records from "@/pages/Records";
import ProtectedRoute from "@/components/ProtectedRoute";
import SuperAdminRoute from "@/components/SuperAdminRoute";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import EduAiAssistant from "@/components/EduAiAssistant";
import LanguageBackground from "@/components/LanguageBackground";
import MobileBottomNavbar from "@/components/MobileBottomNavbar";
import MapViewButton from "./MapViewButton";
import { cn } from "@/lib/utils";

const AppContent: React.FC = () => {
  const [isEduAiAssistantOpen, setIsEduAiAssistantOpen] = useState(false);
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isMockTestPage = location.pathname === '/mock-test';
  const isMobile = useIsMobile();
  const { session } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true";

  const handleLogout = async () => {
    if (session) {
      await supabase.auth.signOut();
      showSuccess(t("common.success_logged_in"));
    } else if (isGuestMode) {
      localStorage.removeItem("isGuestMode");
      sessionStorage.removeItem("guestWelcomeToastShown");
      showSuccess(t("common.success_guest_mode_exited"));
    }
    navigate("/login");
  };

  return (
    <div className={cn(
      "pb-10 bg-background text-foreground min-h-screen relative",
      isMobile && "pb-20"
    )}>
      {!isMockTestPage && <LanguageBackground />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mock-test" element={<MockTest />} />

        <Route element={<SuperAdminRoute />}>
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Home setIsGuideDialogOpen={setIsGuideDialogOpen} handleLogout={handleLogout} isGuideDialogOpen={isGuideDialogOpen} />} />
          <Route path="/add-question" element={<AddQuestion />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/user-profile" element={<UserProfile />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/records" element={<Records />} />
          <Route path="/mood-journal" element={<MoodJournal />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>

      {!isMockTestPage && !isMobile && ( // EduAiAssistant tugmasi faqat ish stoli versiyasida ko'rinadi
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

      {/* MapViewButton sahifaning pastki o'ng qismiga joylashtirildi va joylashuvi optimallashtirildi */}
      {!isMockTestPage && !isMobile && ( // MapViewButton ham faqat ish stoli versiyasida ko'rinadi
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="fixed bottom-4 right-56 z-[9999]" // EduAiAssistant tugmasi bilan to'qnashmasligi uchun right-56 berildi
        >
          <MapViewButton />
        </motion.div>
      )}

      <EduAiAssistant isOpen={isEduAiAssistantOpen} onClose={() => setIsEduAiAssistantOpen(false)} />
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
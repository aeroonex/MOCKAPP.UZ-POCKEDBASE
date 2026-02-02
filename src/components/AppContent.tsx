"use client";

import React, { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

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
import MobileBottomNavbar from "@/components/MobileBottomNavbar"; // Import the new component
import { cn } from "@/lib/utils";

const AppContent: React.FC = () => {
  const [isEduAiAssistantOpen, setIsEduAiAssistantOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();
  const isMockTestPage = location.pathname === '/mock-test';
  const isMobile = useIsMobile(); // Use the hook

  return (
    <div className={cn(
      "pb-10 bg-background text-foreground min-h-screen relative",
      isMobile && "pb-20" // Add extra padding at the bottom for mobile navbar
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
          <Route path="/home" element={<Home />} />
          <Route path="/add-question" element={<AddQuestion />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/user-profile" element={<UserProfile />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/records" element={<Records />} />
          <Route path="/mood-journal" element={<MoodJournal />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>

      {!isMockTestPage && !isMobile && ( // Only show EduAi Assistant button on desktop
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

      <EduAiAssistant isOpen={isEduAiAssistantOpen} onClose={() => setIsEduAiAssistantOpen(false)} />
      <MobileBottomNavbar /> {/* Render the mobile navbar */}
    </div>
  );
};

export default AppContent;
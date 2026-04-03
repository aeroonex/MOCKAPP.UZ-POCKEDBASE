"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LandingPageHeader from "@/components/LandingPageHeader";
import ProcessSteps from "@/components/ProcessSteps";
import ContactSection from "@/components/ContactSection";
import PricingCard from "@/components/PricingCard";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import CustomAuthForm from "@/components/CustomAuthForm";
import { motion } from "framer-motion";
import LoadingSpinner from "@/components/LoadingSpinner";
import RotatingText from "@/components/RotatingText";
import { useIsMobile } from "@/hooks/use-mobile";
import TrustSection from "@/components/TrustSection";
import { useAuth } from "@/context/AuthProvider";
import YouTubeBackgroundVideo from "@/components/YouTubeBackgroundVideo";

const LANDING_BACKGROUND_VIDEO_URL = "https://youtu.be/PQoLr7eVLUI?si=EyE2ur2Q7bEbaJ0x";

const Login: React.FC = () => {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [showGlobalSpinner, setShowGlobalSpinner] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { session } = useAuth();

  const openLoginModal = () => {
    setIsLoginDialogOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginDialogOpen(false);
  };

  const handleTryMe = () => {
    setShowGlobalSpinner(true);
    setTimeout(() => {
      localStorage.setItem("isGuestMode", "true");
      sessionStorage.setItem("showGuestGuide", "true");
      navigate("/home");
      setShowGlobalSpinner(false);
    }, 2000);
  };

  useEffect(() => {
    if (session) {
      setShowGlobalSpinner(true);
      setTimeout(() => {
        closeLoginModal();
        navigate("/home");
        setShowGlobalSpinner(false);
      }, 2500);
      return;
    }

    setShowGlobalSpinner(false);
    localStorage.removeItem("isGuestMode");
    sessionStorage.removeItem("guestWelcomeToastShown");
    sessionStorage.removeItem("showGuestGuide");
  }, [navigate, session]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-white flex flex-col isolate">
      <YouTubeBackgroundVideo url={LANDING_BACKGROUND_VIDEO_URL} />

      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary) / 0.18) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.18) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="pointer-events-none absolute -top-32 left-1/2 z-[1] h-72 w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />

      <div className="relative z-10 flex flex-col min-h-screen">

        <LandingPageHeader onOpenLogin={openLoginModal} />

        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hero-section">
          <div className="lg:flex lg:space-x-12">
            <div className="lg:w-3/5 pb-10">
              <motion.div
                initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
              >
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                  {t("landing_page.title_part1")} <span className="text-primary"><RotatingText type="title" /></span>
                </h1>
                <p className="text-xl sm:text-3xl font-semibold text-white/85 mb-8 drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                  <RotatingText type="subtitle" />
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Button
                  onClick={handleTryMe}
                  className="bg-gradient-purple text-white text-base px-6 py-4 rounded-full shadow-lg transition-all duration-300 animate-button-pulse btn-hover-glow"
                  disabled={showGlobalSpinner}
                >
                  {t("landing_page.try_me_button")}
                </Button>
                <Button
                  onClick={openLoginModal}
                  className="fixed-login-button text-white focus:outline-none focus:ring-4 focus:ring-primary focus:ring-opacity-50 rounded-xl flex items-center gap-2"
                  disabled={showGlobalSpinner}
                >
                  {t("common.login")}
                </Button>
              </div>

              <ProcessSteps />
              <ContactSection />
            </div>

            <div className="lg:w-2/5 mt-10 lg:mt-0 space-y-6">
              <TrustSection />
              <PricingCard />
            </div>
          </div>
        </main>

        <Dialog open={isLoginDialogOpen} onOpenChange={closeLoginModal}>
          <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[425px] p-0 overflow-hidden rounded-2xl border bg-background/80 backdrop-blur-md shadow-2xl">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400" />
            <div className="p-6">
              <DialogHeader className="text-center">
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {t("common.welcome")}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {t("common.auth_description")}
                </DialogDescription>
              </DialogHeader>
              <CustomAuthForm />
              <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
                <p className="leading-relaxed">{t("common.forgot_password_contact_admin_message")}</p>
                <a href="tel:+998772077117" className="mt-2 inline-block text-primary font-semibold underline-offset-4 hover:underline">
                  {t("common.admin_contact_phone")}
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {showGlobalSpinner && <LoadingSpinner />}
      </div>
    </div>
  );
};

export default Login;
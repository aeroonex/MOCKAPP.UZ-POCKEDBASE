"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LandingPageHeader from "@/components/LandingPageHeader";
import ProcessSteps from "@/components/ProcessSteps";
import ContactSection from "@/components/ContactSection";
import PricingCard from "@/components/PricingCard";
import AppFooter from "@/components/AppFooter";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import CustomAuthForm from "@/components/CustomAuthForm";
import { motion } from "framer-motion"; // Import motion from framer-motion
import LoadingSpinner from "@/components/LoadingSpinner"; // Import the new component

const Login: React.FC = () => {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLoadingTryMe, setIsLoadingTryMe] = useState(false); // State for 'Try Me' button loading
  const [isLoadingLogin, setIsLoadingLogin] = useState(false); // New state for login loading
  const { t } = useTranslation();
  const navigate = useNavigate();

  const openLoginModal = () => {
    setIsLoginDialogOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginDialogOpen(false);
  };

  const handleTryMe = () => {
    setIsLoadingTryMe(true); // Start loading
    setTimeout(() => {
      localStorage.setItem("isGuestMode", "true");
      sessionStorage.setItem("showGuestGuide", "true");
      navigate("/home");
      setIsLoadingTryMe(false); // End loading after navigation
    }, 2000); // 2 seconds delay
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !isLoadingLogin) { // Faqatgina login jarayoni tugagan bo'lsa va spinner ishlamayotgan bo'lsa
        setIsLoadingLogin(true); // Login spinnerini ishga tushirish
        setTimeout(() => {
          closeLoginModal();
          navigate("/home");
          setIsLoadingLogin(false); // Spinnerni o'chirish
        }, 2500); // 2.5 soniya kechikish
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, isLoadingLogin]); // isLoadingLogin ni dependency qilib qo'shish

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingPageHeader onOpenLogin={openLoginModal} />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hero-section">
        <div className="lg:flex lg:space-x-12">
          <div className="lg:w-3/5 pb-10">
            <motion.div
              initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 leading-tight">
                {t("landing_page.title_part1")} <span className="text-primary">{t("landing_page.title_part2")}</span>
              </h1>
              <p className="text-xl sm:text-3xl font-semibold text-muted-foreground mb-8">
                {t("landing_page.subtitle")}
              </p>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Button
                onClick={handleTryMe}
                className="bg-gradient-purple text-white text-base px-6 py-4 rounded-full shadow-lg transition-all duration-300 animate-button-pulse btn-hover-glow"
                disabled={isLoadingTryMe || isLoadingLogin} // Disable button while loading
              >
                {t("landing_page.try_me_button")}
              </Button>
              <Button
                onClick={openLoginModal}
                className="fixed-login-button text-white focus:outline-none focus:ring-4 focus:ring-primary focus:ring-opacity-50 rounded-xl flex items-center gap-2"
                disabled={isLoadingTryMe || isLoadingLogin} // Disable button while loading
              >
                {t("common.login")}
              </Button>
            </div>

            <ProcessSteps />
            <ContactSection />
          </div>

          <div className="lg:w-2/5 mt-10 lg:mt-0">
            <PricingCard />
          </div>
        </div>
      </main>

      <Dialog open={isLoginDialogOpen} onOpenChange={closeLoginModal}>
        <DialogContent className="sm:max-w-[425px] p-6">
          <DialogHeader>
            <DialogTitle>{t("common.welcome")}</DialogTitle>
            <DialogDescription>
              {t("common.auth_description")}
            </DialogDescription>
          </DialogHeader>
          <CustomAuthForm />
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>{t("common.forgot_password_contact_admin_message")}</p>
            <a href="tel:+998772077117" className="text-primary hover:underline font-semibold">
              {t("common.admin_contact_phone")}
            </a>
          </div>
        </DialogContent>
      </Dialog>
      {(isLoadingTryMe || isLoadingLogin) && <LoadingSpinner />} {/* Conditionally render spinner */}
      <AppFooter />
    </div>
  );
};

export default Login;
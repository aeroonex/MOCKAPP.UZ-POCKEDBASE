"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LandingPageHeader from "@/components/LandingPageHeader";
import ProcessSteps from "@/components/ProcessSteps";
import ContactSection from "@/components/ContactSection";
import PricingCard from "@/components/PricingCard";
import FixedLoginButton from "@/components/FixedLoginButton";
import LoginDialog from "@/components/LoginDialog";
import LandingPageFooter from "@/components/LandingPageFooter";
import { useTranslation } from 'react-i18next';

const Login: React.FC = () => {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const openLoginModal = () => {
    setIsLoginDialogOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginDialogOpen(false);
  };

  const handleTryMe = () => {
    localStorage.setItem("isGuestMode", "true");
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <LandingPageHeader onOpenLogin={openLoginModal} />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hero-section">
        <div className="lg:flex lg:space-x-12">
          <div className="lg:w-3/5 pb-10">
            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 leading-tight">
              {t("landing_page.title_part1")} <span className="text-primary">{t("landing_page.title_part2")}</span>
            </h1>
            <p className="text-3xl font-semibold text-gray-500 mb-8">
              {t("landing_page.subtitle")}
            </p>

            <Button
              onClick={handleTryMe}
              className="bg-green-500 hover:bg-green-600 text-white text-lg px-8 py-6 rounded-full shadow-lg mb-10 transition-all duration-300 hover:scale-105 animate-glitch-effect"
            >
              {t("landing_page.try_me_button")}
            </Button>

            <ProcessSteps />
            <ContactSection />
          </div>

          <div className="lg:w-2/5 mt-10 lg:mt-0">
            <PricingCard />
          </div>
        </div>
      </main>

      <FixedLoginButton onOpenLogin={openLoginModal} />
      <LoginDialog isOpen={isLoginDialogOpen} onClose={closeLoginModal} />
      <LandingPageFooter />
    </div>
  );
};

export default Login;
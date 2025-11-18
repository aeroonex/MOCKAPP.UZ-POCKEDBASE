"use client";

import React, { useState } from "react";
import LandingPageHeader from "@/components/LandingPageHeader";
import ProcessSteps from "@/components/ProcessSteps";
import ContactSection from "@/components/ContactSection";
import PricingCard from "@/components/PricingCard";
import FixedLoginButton from "@/components/FixedLoginButton";
import LoginDialog from "@/components/LoginDialog";
import { useTranslation } from 'react-i18next';

const Login: React.FC = () => {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const { t } = useTranslation();

  const openLoginModal = () => {
    setIsLoginDialogOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingPageHeader onOpenLogin={openLoginModal} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hero-section">
        <div className="lg:flex lg:space-x-12">
          <div className="lg:w-3/5 pb-10">
            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 leading-tight">
              {t("landing_page.title_part1")} <span className="text-lime-500">{t("landing_page.title_part2")}</span>
            </h1>
            <p className="text-3xl font-semibold text-gray-500 mb-8">
              {t("landing_page.subtitle")}
            </p>

            <ProcessSteps />
            <ContactSection />

            <p className="text-gray-600 max-w-[600px] mt-8">
              {t("landing_page.description")}
            </p>
          </div>

          <div className="lg:w-2/5 mt-10 lg:mt-0">
            <PricingCard />
          </div>
        </div>
      </main>

      <FixedLoginButton onOpenLogin={openLoginModal} />
      <LoginDialog isOpen={isLoginDialogOpen} onClose={closeLoginModal} />
    </div>
  );
};

export default Login;
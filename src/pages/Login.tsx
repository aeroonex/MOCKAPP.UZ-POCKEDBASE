"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LandingPageHeader from "@/components/LandingPageHeader";
import ProcessSteps from "@/components/ProcessSteps";
import ContactSection from "@/components/ContactSection";
import PricingCard from "@/components/PricingCard";
import LandingPageFooter from "@/components/LandingPageFooter";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    sessionStorage.setItem("showGuestGuide", "true"); // Qo'llanmani ko'rsatish uchun belgi
    toast.info(t("landing_page.guest_mode_welcome"));
    navigate("/home");
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        closeLoginModal();
        navigate("/home");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingPageHeader onOpenLogin={openLoginModal} />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hero-section">
        <div className="lg:flex lg:space-x-12">
          <div className="lg:w-3/5 pb-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 leading-tight">
              {t("landing_page.title_part1")} <span className="text-primary">{t("landing_page.title_part2")}</span>
            </h1>
            <p className="text-xl sm:text-3xl font-semibold text-muted-foreground mb-8">
              {t("landing_page.subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Button
                onClick={handleTryMe}
                className="bg-gradient-purple text-white text-base px-6 py-4 rounded-full shadow-lg transition-all duration-300 animate-button-pulse btn-hover-glow"
              >
                {t("landing_page.try_me_button")}
              </Button>
              <Button
                onClick={openLoginModal}
                className="fixed-login-button text-white focus:outline-none focus:ring-4 focus:ring-primary focus:ring-opacity-50 rounded-xl flex items-center gap-2"
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
        <DialogContent className="sm:max-w-[425px] p-0">
          <div className="p-6">
            <Auth
              supabaseClient={supabase}
              providers={[]}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'hsl(var(--primary))',
                      brandAccent: 'hsl(var(--primary-foreground))',
                    },
                  },
                },
              }}
              theme="light"
              view="sign_in"
              showLinks={false}
              localization={{
                variables: {
                  sign_in: {
                    email_label: t("common.email"),
                    password_label: t("common.password"),
                    email_input_placeholder: t("common.enter_your_email"),
                    password_input_placeholder: t("common.enter_your_password"),
                    button_label: t("common.login"),
                    loading_button_label: t("common.logging_in"),
                  },
                },
              }}
            />
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>{t("common.forgot_password_contact_admin_message")}</p>
              <a href="tel:+998772077117" className="text-primary hover:underline font-semibold">
                {t("common.admin_contact_phone")}
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <LandingPageFooter />
    </div>
  );
};

export default Login;
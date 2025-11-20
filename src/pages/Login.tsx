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
import { Dialog, DialogContent } from "@/components/ui/dialog"; // Dialog komponentini import qildim
import { Auth } from '@supabase/auth-ui-react'; // Supabase Auth UI komponentini import qildim
import { ThemeSupa } from '@supabase/auth-ui-shared'; // Supabase Auth UI uchun temani import qildim
import { supabase } from "@/integrations/supabase/client"; // Supabase clientni import qildim
import { toast } from "sonner"; // Toast xabarlari uchun

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
    toast.info(t("landing_page.guest_mode_welcome"));
    navigate("/home");
  };

  // Supabase Auth UI komponenti uchun o'zgarishlarni kuzatish
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Agar foydalanuvchi tizimga kirsa yoki parolni tiklasa
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

      {/* LoginDialog o'rniga Supabase Auth komponentini ishlatamiz */}
      <Dialog open={isLoginDialogOpen} onOpenChange={closeLoginModal}>
        <DialogContent className="sm:max-w-[425px] p-0"> {/* Paddingni olib tashladim, Auth komponenti o'zi padding beradi */}
          <Auth
            supabaseClient={supabase}
            providers={[]} // Faqat email/password orqali kirishni qoldirdim
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))', // Asosiy rangni Tailwind primary rangiga mosladim
                    brandAccent: 'hsl(var(--primary-foreground))', // Accent rangni ham mosladim
                  },
                },
              },
            }}
            theme="light" // Ilovangizning umumiy mavzusiga mos ravishda
            view="sign_in" // Dastlabki ko'rinishni sign_in qilib belgiladim
            localization={{
              variables: {
                sign_in: {
                  email_label: t("common.email"),
                  password_label: t("common.password"),
                  email_input_placeholder: t("common.enter_your_email"),
                  password_input_placeholder: t("common.enter_your_password"),
                  button_label: t("common.login"),
                  loading_button_label: t("common.logging_in"),
                  link_text: t("common.admin_only"),
                },
                forgotten_password: {
                  email_label: t("common.email"),
                  password_label: t("common.password"),
                  email_input_placeholder: t("common.enter_your_email"),
                  button_label: t("user_profile_page.update_credentials"),
                  loading_button_label: t("common.save_changes"),
                  link_text: t("user_profile_page.update_login_credentials"),
                  confirmation_text: t("user_profile_page.success_email_update_check_inbox"),
                },
                update_password: {
                  password_label: t("user_profile_page.new_password"),
                  password_input_placeholder: t("user_profile_page.enter_new_password"),
                  button_label: t("user_profile_page.update_credentials"),
                  loading_button_label: t("common.save_changes"),
                  confirmation_text: t("user_profile_page.success_password_updated"),
                },
              },
            }}
          />
        </DialogContent>
      </Dialog>
      <LandingPageFooter />
    </div>
  );
};

export default Login;
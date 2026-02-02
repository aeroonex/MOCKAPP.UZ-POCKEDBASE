"use client";
import React from "react";
import { Server, Lock } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

const AppFooter: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isMobile = useIsMobile(); // Use the hook
  const isMockTestPage = location.pathname === '/mock-test';

  if (isMockTestPage || isMobile) { // Hide on mock test page OR on mobile
    return null;
  }

  return (
    <footer className="mt-auto bg-card border-t border-border py-6 text-foreground footer-glow">
      <div className="container mx-auto px-4 flex flex-col items-center space-y-4">

        <div className="text-center">
          <h3 className="text-xl font-bold mb-0.5">Edumock.uz</h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            {t("landing_page.slogan_short", "Your platform for conversational practice and real results.")}
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 opacity-90">
          <div className="flex items-center gap-2 group cursor-default" title={t("landing_page.footer_educloud_title")}>
            <div className="p-1.5 bg-blue-50/50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-900 group-hover:border-blue-300 transition-colors">
              <Server className="w-4 h-4 text-[#0EA5E9]" />
            </div>
            <span className="text-xs font-medium text-foreground">{t("landing_page.footer_powered_by")} EduCloud</span>
          </div>

          <div className="flex items-center gap-2 group cursor-default" title={t("landing_page.footer_ssl_title")}>
            <div className="p-1.5 bg-emerald-50/50 dark:bg-emerald-900/30 rounded-full border border-emerald-100 dark:border-emerald-900 group-hover:border-emerald-300 transition-colors">
              <Lock className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-xs font-medium text-foreground">{t("landing_page.footer_data_secured")} SSL Encrypted</span>
          </div>
        </div>

        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          <a href="#" className="text-muted-foreground hover:text-primary transition">
            {t("landing_page.privacy_policy")}
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition">
            {t("landing_page.terms_of_use")}
          </a>
        </nav>

        <div className="border-t border-border w-full pt-4 text-center mt-4">
          <p className="text-muted-foreground text-xs font-medium">
            &copy; {new Date().getFullYear()} Edumock.uz, Inc. {t("landing_page.all_rights_reserved")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
"use client";
import React from "react";
import { Server, Lock } from "lucide-react";
import { useTranslation } from 'react-i18next';

const AppFooter: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto bg-card border-t border-border py-12 text-foreground footer-glow">
      <div className="container mx-auto px-4 flex flex-col items-center space-y-8">

        {/* Brand Info */}
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-1">Edumock.uz</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("landing_page.slogan_short", "Your platform for conversational practice and real results.")}
          </p>
        </div>

        {/* Trust Badges Section */}
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 opacity-90">
          {/* EduCloud Ownership */}
          <div className="flex items-center gap-3 group cursor-default" title={t("landing_page.footer_educloud_title")}>
            <div className="p-2 bg-blue-50/50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-900 group-hover:border-blue-300 transition-colors">
              <Server className="w-5 h-5 text-[#0EA5E9]" />
            </div>
            <span className="text-sm font-medium text-foreground">{t("landing_page.footer_powered_by")} EduCloud</span>
          </div>

          {/* Data Security / SSL */}
          <div className="flex items-center gap-3 group cursor-default" title={t("landing_page.footer_ssl_title")}>
            <div className="p-2 bg-emerald-50/50 dark:bg-emerald-900/30 rounded-full border border-emerald-100 dark:border-emerald-900 group-hover:border-emerald-300 transition-colors">
              <Lock className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-sm font-medium text-foreground">{t("landing_page.footer_data_secured")} SSL Encrypted</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <a href="#" className="text-muted-foreground hover:text-primary transition">
            {t("landing_page.privacy_policy")}
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition">
            {t("landing_page.terms_of_use")}
          </a>
        </nav>

        {/* Copyright Section */}
        <div className="border-t border-border w-full pt-6 text-center mt-8">
          <p className="text-muted-foreground text-xs font-medium">
            &copy; {new Date().getFullYear()} Edumock.uz, Inc. {t("landing_page.all_rights_reserved")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
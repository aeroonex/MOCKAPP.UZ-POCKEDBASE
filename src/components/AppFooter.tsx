"use client";
import React from "react";
import { Server, Lock } from "lucide-react";
import { useTranslation } from 'react-i18next';

const AppFooter: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto bg-card border-t border-border pt-10 pb-6 text-foreground">
      <div className="container mx-auto px-4">
        {/* Trust Badges Section (Ishonchlilik belgilari) */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 mb-8 opacity-90">
          {/* EduCloud Ownership */}
          <div className="flex items-center gap-3 group cursor-default" title={t("landing_page.footer_educloud_title")}>
            <div className="p-2 bg-blue-50/50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-900 group-hover:border-blue-300 transition-colors">
              <Server className="w-6 h-6 text-[#0EA5E9]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("landing_page.footer_powered_by")}</span>
              <span className="text-sm font-bold text-foreground">EduCloud</span>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-8 bg-border"></div>

          {/* Data Security / SSL */}
          <div className="flex items-center gap-3 group cursor-default" title={t("landing_page.footer_ssl_title")}>
            <div className="p-2 bg-emerald-50/50 dark:bg-emerald-900/30 rounded-full border border-emerald-100 dark:border-emerald-900 group-hover:border-emerald-300 transition-colors">
              <Lock className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("landing_page.footer_data_secured")}</span>
              <span className="text-sm font-bold text-foreground">SSL Encrypted</span>
            </div>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="border-t border-border pt-6 text-center">
          <p className="text-muted-foreground text-sm font-medium">
            &copy; {new Date().getFullYear()} Edumock.uz, Inc. {t("landing_page.all_rights_reserved")}
          </p>
          <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <a href="#" className="hover:text-primary transition">
              {t("landing_page.privacy_policy")}
            </a>
            <span>•</span>
            <a href="#" className="hover:text-primary transition">
              {t("landing_page.terms_of_use")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
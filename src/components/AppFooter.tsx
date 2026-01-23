"use client";
import React from "react";
import { useTranslation } from 'react-i18next';

const AppFooter: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto bg-card border-t border-border pt-10 pb-6 text-foreground">
      <div className="container mx-auto px-4">
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
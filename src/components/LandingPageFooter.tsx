"use client";

import React from "react";
import { useTranslation } from 'react-i18next';

const LandingPageFooter: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="w-full bg-background py-8 text-center text-sm text-muted-foreground">
      <p className="mb-2">©2025 Edumock.uz, Inc. {t("landing_page.all_rights_reserved")}</p>
      <div className="flex justify-center space-x-4">
        <a href="#" className="hover:underline">
          {t("landing_page.privacy_policy")}
        </a>
        <a href="#" className="hover:underline">
          {t("landing_page.terms_of_use")}
        </a>
      </div>
    </footer>
  );
};

export default LandingPageFooter;
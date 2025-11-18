"use client";

import React from "react";
import { Phone, Upload } from "lucide-react";
import { useTranslation } from 'react-i18next';

const ContactSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 mt-12 max-w-[600px]">
      <div className="p-5 rounded-xl shadow-lg bg-lime-50 border border-lime-300 animated-card" style={{ animationDelay: '1.1s' }}>
        <p className="text-xl font-extrabold text-lime-700">
          {t("landing_page.slogan")}
        </p>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-xl border border-gray-200 animated-card" style={{ animationDelay: '1.3s' }}>
        <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center">
          <div className="bg-lime-500 rounded-full p-2 mr-3">
            <Phone className="h-6 w-6 text-white" />
          </div>
          {t("landing_page.contact_us")}
        </h2>
        <div className="space-y-2 text-gray-700 pl-3">
          <p className="flex items-center text-lg">
            <span className="text-lime-500 mr-2">
              <Phone className="h-5 w-5" />
            </span>
            <a href="tel:+998772077117" className="text-gray-900 font-semibold font-mono">{t("landing_page.phone_number")}</a>
          </p>
          <p className="flex items-center text-lg">
            <span className="text-lime-500 mr-2">
              <Upload className="h-5 w-5" />
            </span>
            <a href="https://t.me/aero_one" target="_blank" rel="noopener noreferrer" className="text-gray-900 font-semibold font-mono">{t("landing_page.telegram_username")}</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactSection;
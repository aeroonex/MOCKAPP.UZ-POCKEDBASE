"use client";

import React from "react";
import { Phone, Upload } from "lucide-react";
import { useTranslation } from 'react-i18next';

const ContactSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 mt-12 max-w-[600px]">
      <div className="p-5 rounded-xl shadow-lg bg-primary/5 border border-primary/30 animated-card" style={{ animationDelay: '1.1s' }}>
        <p className="text-base font-normal leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: t("landing_page.description") }} /> {/* text-gray-700 -> text-foreground */}
      </div>

      <div className="bg-card p-5 rounded-xl shadow-xl border border-border animated-card" style={{ animationDelay: '1.3s' }}> {/* bg-white -> bg-card, border-gray-200 -> border-border */}
        <h2 className="text-xl font-bold text-foreground mb-3 flex items-center"> {/* text-gray-900 -> text-foreground */}
          <div className="bg-primary rounded-full p-2 mr-3">
            <Phone className="h-6 w-6 text-white" />
          </div>
          {t("landing_page.contact_us")}
        </h2>
        <div className="space-y-2 text-muted-foreground pl-3"> {/* text-gray-700 -> text-muted-foreground */}
          <p className="flex items-center text-lg">
            <span className="text-primary mr-2">
              <Phone className="h-5 w-5" />
            </span>
            <a href="tel:+998772077117" className="text-foreground font-semibold font-mono">{t("landing_page.phone_number")}</a> {/* text-gray-900 -> text-foreground */}
          </p>
          <p className="flex items-center text-lg">
            <span className="text-primary mr-2">
              <Upload className="h-5 w-5" />
            </span>
            <a href="https://t.me/aero_one" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold font-mono">Telegram</a> {/* text-gray-900 -> text-foreground */}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactSection;
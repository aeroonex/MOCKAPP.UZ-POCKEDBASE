"use client";

import React from "react";
import { Phone, MessageSquareText } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ContactSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 mt-10 sm:mt-12 max-w-[600px]">
      <div
        className="p-5 sm:p-6 rounded-2xl shadow-xl bg-gradient-to-br from-white/95 via-white/90 to-white/85 border border-white/60 backdrop-blur-sm text-slate-900 dark:from-slate-900/90 dark:via-slate-900/85 dark:to-slate-800/80 dark:border-white/10 dark:text-white"
        style={{ animationDelay: '1.1s' }}
      >
        <p
          className="text-sm sm:text-base font-normal leading-relaxed text-inherit"
          dangerouslySetInnerHTML={{ __html: t("landing_page.description") }}
        />
      </div>

      <Card
        className="overflow-hidden border-white/60 bg-white/95 text-slate-900 shadow-xl dark:border-white/10 dark:bg-slate-900/90 dark:text-white"
        style={{ animationDelay: '1.3s' }}
      >
        <CardHeader className="border-b border-slate-200/80 bg-gradient-to-r from-white via-slate-50 to-white dark:border-white/10 dark:from-slate-900 dark:via-slate-800/95 dark:to-slate-900">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            <div className="bg-primary rounded-full p-2 mr-3 shadow-md shadow-primary/20">
              <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            {t("landing_page.contact_us")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 bg-transparent">
          <a
            href="tel:+998772077117"
            className="flex items-center p-4 rounded-xl border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-all duration-200 group hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-800/90 dark:text-white dark:hover:bg-slate-800"
          >
            <div className="bg-primary/10 group-hover:bg-primary transition-colors rounded-full p-2 mr-4">
              <Phone className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">{t("landing_page.call_us", "Call Us")}</p>
              <p className="text-base sm:text-lg font-semibold font-mono text-slate-900 dark:text-white">+998 77 207 71 17</p>
            </div>
          </a>

          <a
            href="https://t.me/aero_one"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 rounded-xl border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-all duration-200 group hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-800/90 dark:text-white dark:hover:bg-slate-800"
          >
            <div className="bg-primary/10 group-hover:bg-primary transition-colors rounded-full p-2 mr-4">
              <MessageSquareText className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">{t("landing_page.message_us", "Message Us")}</p>
              <p className="text-base sm:text-lg font-semibold font-mono text-slate-900 dark:text-white">Telegram</p>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactSection;
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
        className="p-5 sm:p-6 rounded-2xl shadow-xl bg-gradient-to-br from-primary/10 via-background/60 to-background border border-primary/20 backdrop-blur-sm dark:from-white dark:via-white dark:to-white dark:border-white"
        style={{ animationDelay: '1.1s' }}
      >
        <p
          className="text-sm sm:text-base font-normal leading-relaxed text-foreground dark:text-black"
          dangerouslySetInnerHTML={{ __html: t("landing_page.description") }}
        />
      </div>

      <Card className="overflow-hidden border-border/60 shadow-xl dark:bg-white dark:border-white" style={{ animationDelay: '1.3s' }}>
        <CardHeader className="border-b bg-gradient-to-r from-primary/10 via-background to-background dark:from-white dark:via-white dark:to-white dark:border-white">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold text-foreground dark:text-black">
            <div className="bg-primary rounded-full p-2 mr-3 shadow-md shadow-primary/20">
              <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            {t("landing_page.contact_us")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 dark:bg-white">
          <a
            href="tel:+998772077117"
            className="flex items-center p-4 rounded-xl border border-border/60 bg-background/60 hover:bg-accent/60 hover:text-accent-foreground transition-all duration-200 group hover:-translate-y-0.5 dark:bg-white dark:border-gray-200 dark:hover:bg-gray-100"
          >
            <div className="bg-primary/10 group-hover:bg-primary transition-colors rounded-full p-2 mr-4">
              <Phone className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground dark:text-gray-600">{t("landing_page.call_us", "Call Us")}</p>
              <p className="text-base sm:text-lg font-semibold font-mono text-foreground dark:text-black">+998 77 207 71 17</p>
            </div>
          </a>

          <a
            href="https://t.me/aero_one"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 rounded-xl border border-border/60 bg-background/60 hover:bg-accent/60 hover:text-accent-foreground transition-all duration-200 group hover:-translate-y-0.5 dark:bg-white dark:border-gray-200 dark:hover:bg-gray-100"
          >
            <div className="bg-primary/10 group-hover:bg-primary transition-colors rounded-full p-2 mr-4">
              <MessageSquareText className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground dark:text-gray-600">{t("landing_page.message_us", "Message Us")}</p>
              <p className="text-base sm:text-lg font-semibold font-mono text-foreground dark:text-black">Telegram</p>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactSection;
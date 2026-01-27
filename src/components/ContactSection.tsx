"use client";

import React from "react";
import { Phone, MessageSquareText } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ContactSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 mt-12 max-w-[600px]">
      <div className="p-5 rounded-xl shadow-lg bg-primary/5 border border-primary/30 animated-card" style={{ animationDelay: '1.1s' }}>
        <p className="text-base font-normal leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: t("landing_page.description") }} />
      </div>

      {/* Yangilangan Aloqa Bo'limi Dizayni */}
      <Card style={{ animationDelay: '1.3s' }}> {/* animated-card va card-glow klasslari vaqtincha olib tashlandi */}
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold text-foreground">
            <div className="bg-primary rounded-full p-2 mr-3">
              <Phone className="h-6 w-6 text-white" />
            </div>
            {t("landing_page.contact_us")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Telefon Aloqasi */}
          <a
            href="tel:+998772077117"
            className="flex items-center p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors group"
          >
            <div className="bg-primary/10 group-hover:bg-primary transition-colors rounded-full p-2 mr-4">
              <Phone className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("landing_page.call_us", "Call Us")}</p>
              <p className="text-lg font-semibold font-mono text-foreground">+998 77 207 71 17</p>
            </div>
          </a>

          {/* Telegram Aloqasi */}
          <a
            href="https://t.me/aero_one"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors group"
          >
            <div className="bg-primary/10 group-hover:bg-primary transition-colors rounded-full p-2 mr-4">
              <MessageSquareText className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("landing_page.message_us", "Message Us")}</p>
              <p className="text-lg font-semibold font-mono text-foreground">Telegram</p>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactSection;
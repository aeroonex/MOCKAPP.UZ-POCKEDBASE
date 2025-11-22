"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import AppFooter from "@/components/AppFooter"; // Yangi import
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from "lucide-react";

const SuperAdminDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-4xl shadow-2xl border-4 border-primary/50">
          <CardHeader className="text-center bg-primary/10 py-6">
            <CardTitle className="text-4xl font-extrabold text-primary flex items-center justify-center gap-3">
              <ShieldCheck className="h-8 w-8" />
              {t("superadmin_page.dashboard_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <p className="text-lg text-muted-foreground text-center">
              {t("superadmin_page.welcome_message")}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-secondary">
                <h4 className="font-semibold text-xl">1. {t("superadmin_page.user_management")}</h4>
                <p className="text-sm text-muted-foreground">{t("superadmin_page.user_management_desc")}</p>
              </div>
              <div className="p-4 border rounded-lg bg-secondary">
                <h4 className="font-semibold text-xl">2. {t("superadmin_page.analytics")}</h4>
                <p className="text-sm text-muted-foreground">{t("superadmin_page.analytics_desc")}</p>
              </div>
              <div className="p-4 border rounded-lg bg-secondary">
                <h4 className="font-semibold text-xl">3. {t("superadmin_page.system_logs")}</h4>
                <p className="text-sm text-muted-foreground">{t("superadmin_page.system_logs_desc")}</p>
              </div>
            </div>
            
            <div className="text-center pt-4">
                <p className="text-sm text-red-500 font-medium">{t("superadmin_page.warning")}</p>
            </div>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
};

export default SuperAdminDashboard;
"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// import { useTheme } from "next-themes"; // useTheme importini olib tashladim
import { useTranslation } from 'react-i18next';

const Settings: React.FC = () => {
  // const { theme, setTheme } = useTheme(); // useTheme hookini olib tashladim
  const { t } = useTranslation();

  // console.log("Current theme from useTheme:", theme); // Konsol logini olib tashladim

  // handleThemeChange funksiyasini olib tashladim
  // const handleThemeChange = (checked: boolean) => {
  //   const newTheme = checked ? "dark" : "light";
  //   console.log("Attempting to set theme to:", newTheme);
  //   setTheme(newTheme);
  // };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">{t("settings_page.settings")}</CardTitle>
            <CardDescription>{t("settings_page.manage_preferences")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tungi rejim sozlamasi olib tashlandi */}
            {/*
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="text-base">{t("settings_page.dark_mode")}</Label>
              <Switch 
                id="dark-mode" 
                checked={theme === "dark"}
                onCheckedChange={handleThemeChange}
              />
            </div>
            */}
            <div className="space-y-2">
              <Label htmlFor="username-setting" className="text-base">{t("settings_page.username")}</Label>
              <Input id="username-setting" type="text" placeholder={t("settings_page.your_username")} defaultValue="user" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-setting" className="text-base">{t("settings_page.email")}</Label>
              <Input id="email-setting" type="email" placeholder={t("settings_page.your_email")} defaultValue="user@example.com" />
            </div>
            <Button className="w-full">{t("settings_page.save_profile")}</Button>
          </CardContent>
        </Card>
      </main>
      <CefrCentreFooter />
    </div>
  );
};

export default Settings;
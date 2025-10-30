"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes"; // useTheme hookini import qilish

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme(); // useTheme hookidan foydalanish

  console.log("Current theme from useTheme:", theme); // Debug log

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light";
    console.log("Attempting to set theme to:", newTheme); // Debug log
    setTheme(newTheme);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Settings</CardTitle>
            <CardDescription>Manage your application preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="text-base">Dark Mode</Label>
              <Switch 
                id="dark-mode" 
                checked={theme === "dark"} // Joriy temaga qarab holatni belgilash
                onCheckedChange={handleThemeChange} // O'zgarishlarni boshqarish
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username-setting" className="text-base">Username</Label>
              <Input id="username-setting" type="text" placeholder="Your username" defaultValue="user" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-setting" className="text-base">Email</Label>
              <Input id="email-setting" type="email" placeholder="Your email" defaultValue="user@example.com" />
            </div>
            <Button className="w-full">Save Changes</Button>
          </CardContent>
        </Card>
      </main>
      <CefrCentreFooter />
    </div>
  );
};

export default Settings;
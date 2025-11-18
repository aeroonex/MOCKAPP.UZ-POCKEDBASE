"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useTranslation } from 'react-i18next';

const UserProfile: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">{t("user_profile_page.user_profile")}</CardTitle>
            <CardDescription>{t("user_profile_page.view_update_profile")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>
                  <User className="h-12 w-12 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">John Doe</h3>
              <p className="text-muted-foreground">john.doe@example.com</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name" className="text-base">{t("user_profile_page.full_name")}</Label>
                <Input id="full-name" type="text" placeholder={t("user_profile_page.your_full_name")} defaultValue="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-profile" className="text-base">{t("user_profile_page.email_address")}</Label>
                <Input id="email-profile" type="email" placeholder={t("settings_page.your_email")} defaultValue="john.doe@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-base">{t("user_profile_page.bio")}</Label>
                <Input id="bio" type="text" placeholder={t("user_profile_page.tell_about_yourself")} defaultValue="A passionate learner." />
              </div>
            </div>
            <Button className="w-full">{t("settings_page.save_profile")}</Button>
          </CardContent>
        </Card>
      </main>
      <CefrCentreFooter />
    </div>
  );
};

export default UserProfile;
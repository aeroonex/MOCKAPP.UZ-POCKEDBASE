"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Cloud } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useProfile, formatBytes } from "@/hooks/use-profile"; // Yangi hook va yordamchi funksiyalar
import { Progress } from "@/components/ui/progress"; // Progress komponenti
import { Badge } from "@/components/ui/badge"; // Badge import qilindi

const UserProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, loading, fetchProfile } = useProfile();

  // Profil ma'lumotlarini saqlash uchun state
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setBio(profile.bio || "");
      console.log("UserProfile: Profile loaded/updated:", {
        used: profile.storage_used_bytes,
        limit: profile.storage_limit_bytes
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user || !profile) {
      showError(t("user_profile_page.error_login_to_save"));
      return;
    }
    setIsSaving(true);

    try {
      // 1. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          bio: bio.trim(),
        })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      // 2. Update auth.users metadata (optional, but good practice for full_name)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        }
      });

      if (authError) {
        console.warn("Could not update user metadata:", authError.message);
        // Bu yerda xato ko'rsatmaslik, chunki asosiy profil yangilandi
      }
      
      // Profilni yangilash tugagandan so'ng, yangi ma'lumotlarni yuklash
      await fetchProfile();

      showSuccess(t("settings_page.success_profile_saved"));
    } catch (error: any) {
      showError(`${t("settings_page.error_saving_profile")} ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  const totalLimit = profile?.storage_limit_bytes || 0;
  const usedSpace = profile?.storage_used_bytes || 0;
  const usagePercentage = totalLimit > 0 ? (usedSpace / totalLimit) * 100 : 0;
  const isPremium = profile?.tariff_name !== 'Basic';

  const getProgressColor = () => {
    if (usagePercentage >= 90) {
      return "bg-red-500";
    }
    if (usagePercentage >= 75) {
      return "bg-yellow-400";
    }
    return "bg-yellow-300";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">{t("user_profile_page.user_profile")}</CardTitle>
            <CardDescription>{t("user_profile_page.view_update_profile")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.user_metadata?.avatar_url || "https://github.com/shadcn.png"} alt="@shadcn" />
                <AvatarFallback>
                  <User className="h-12 w-12 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">{profile?.username || user?.email?.split('@')[0] || "Guest User"}</h3>
              <p className="text-muted-foreground">{user?.email || "guest@example.com"}</p>
            </div>

            {/* Storage Usage Section (Premium Design) */}
            <div className="p-4 bg-[#1A237E] text-white border-4 border-[#3F51B5] shadow-2xl rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Cloud className="h-6 w-6 text-yellow-300" />
                  <h4 className="text-xl font-bold">{t("user_profile_page.cloud_storage")}</h4>
                  {isPremium && (
                    <Badge className="bg-yellow-400 text-black font-bold hover:bg-yellow-500">
                      PREMIUM
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-baseline mb-1">
                <p className="text-3xl font-bold">
                  {formatBytes(usedSpace)}
                </p>
                <p className="text-lg font-medium text-gray-300">
                  / {formatBytes(totalLimit)}
                </p>
              </div>
              
              {/* Maxsus Progress Bar */}
              <div className="w-full bg-[#3F51B5] rounded-full h-2.5 overflow-hidden mb-1">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ease-out ${getProgressColor()}`}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>

              <div className="flex justify-end">
                <p className="text-sm text-gray-300">
                  {t("records_page.used_percentage", { percentage: usagePercentage.toFixed(1) })}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="first-name" className="text-base">{t("user_profile_page.first_name")}</Label>
                <Input 
                  id="first-name" 
                  type="text" 
                  placeholder={t("user_profile_page.your_first_name")} 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name" className="text-base">{t("user_profile_page.last_name")}</Label>
                <Input 
                  id="last-name" 
                  type="text" 
                  placeholder={t("user_profile_page.your_last_name")} 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-base">{t("user_profile_page.bio")}</Label>
                <Input 
                  id="bio" 
                  type="text" 
                  placeholder={t("user_profile_page.tell_about_yourself")} 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSaveProfile} className="w-full" disabled={isSaving}>
              {isSaving ? t("common.saving") : t("settings_page.save_profile")}
            </Button>
          </CardContent>
        </Card>
      </main>
      <CefrCentreFooter />
    </div>
  );
};

export default UserProfile;
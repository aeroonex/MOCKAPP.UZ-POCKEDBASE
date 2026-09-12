"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { showError } from "@/utils/toast";
import { useTranslation } from 'react-i18next';
import { refreshAuth } from "@/lib/api";

interface Profile {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  role: string; // Yangi: Rolni qo'shish
  tariff_name: string; // Yangi: Tarif nomini qo'shish
  storage_limit_bytes: number;
  storage_used_bytes: number;
}

// Baytlarni GB yoki MB ga aylantirish uchun yordamchi funksiya
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const useProfile = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const u: any = (await refreshAuth()) || user;
      setProfile({
        id: u.id,
        username: u.username || String(u.email || "").split("@")[0] || "user",
        first_name: u.first_name || undefined,
        last_name: u.last_name || undefined,
        bio: u.bio || undefined,
        role: u.role || "user",
        tariff_name: u.tariff_name || "Basic",
        storage_limit_bytes: typeof u.storage_limit_bytes === "number" ? u.storage_limit_bytes : 10737418240,
        storage_used_bytes: typeof u.storage_used_bytes === "number" ? u.storage_used_bytes : 0,
      });
    } catch (e: any) {
      showError(`${t("user_profile_page.error_loading_profile")} ${e?.message || String(e)}`);
      setProfile({
        id: user.id,
        username: (user as any).username || String((user as any).email || "").split("@")[0] || "user",
        role: "user",
        tariff_name: "Basic",
        storage_limit_bytes: 10737418240,
        storage_used_bytes: 0,
      });
    }
    setLoading(false);
  }, [user, t]);

  useEffect(() => {
    fetchProfile();
  }, [user, fetchProfile]);

  return { profile, loading, fetchProfile };
};
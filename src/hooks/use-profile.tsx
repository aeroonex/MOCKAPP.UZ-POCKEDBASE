"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { showError } from "@/utils/toast";
import { useTranslation } from 'react-i18next';

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
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, bio, role, tariff_name, storage_limit_bytes, storage_used_bytes') // 'tariff_name' ni so'rovga qo'shish
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      showError(`${t("user_profile_page.error_loading_profile")} ${error.message}`);
      setProfile(null);
    } else if (data) {
      setProfile(data as Profile);
    } else {
      // Agar profil topilmasa, default qiymatlar bilan bo'sh profil yaratish
      setProfile({
        id: user.id,
        username: user.email?.split('@')[0] || 'user',
        role: 'user', // Default rol
        tariff_name: 'Basic', // Default tarif
        storage_limit_bytes: 10737418240, // Default 10 GB (10 * 1024 * 1024 * 1024)
        storage_used_bytes: 0,
      });
    }
    setLoading(false);
  }, [user, t]);

  useEffect(() => {
    fetchProfile();

    if (!user) return;

    // Profil o'zgarishlarini real vaqtda tinglash uchun subscription
    const channel = supabase
      .channel(`profile-changes:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime profile update received:', payload.new);
          setProfile(payload.new as Profile);
        }
      )
      .subscribe();

    // Komponent unmount bo'lganda subscriptionni tozalash
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchProfile]);

  return { profile, loading, fetchProfile };
};
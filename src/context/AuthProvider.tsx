"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import i18n from '@/i18n';

interface Profile {
  id: string;
  is_blocked: boolean;
  role: string; // Rolni ham qo'shdik
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isBlocked: boolean | null;
  isSuperAdmin: boolean; // Yangi: Super admin holati
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false); // Yangi: Super admin holati
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
    console.log("AuthProvider: Fetching user profile for ID:", userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('is_blocked, role') // Rolni ham tanlab olamiz
      .eq('id', userId)
      .single(); // maybeSingle o'rniga single ishlatamiz

    if (error) {
      console.error("AuthProvider: Error fetching user profile:", error.message);
      showError(i18n.t("common.error_fetching_profile", { message: error.message }));
      return null;
    }
    console.log("AuthProvider: User profile fetched:", data);
    return data ? (data as Profile) : null;
  };

  useEffect(() => {
    const getSessionAndProfile = async () => {
      setLoading(true);
      console.log("AuthProvider: Initial session check started.");
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        console.log("AuthProvider: User found in initial session, fetching profile.");
        const profile = await fetchUserProfile(currentUser.id);
        setIsBlocked(profile?.is_blocked ?? false);
        setIsSuperAdmin(profile?.role === 'developer');
      } else {
        console.log("AuthProvider: No user found in initial session.");
        setIsBlocked(null);
        setIsSuperAdmin(false);
      }
      setLoading(false);
      console.log("AuthProvider: Initial session check finished. isSuperAdmin:", isSuperAdmin);
    };

    getSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      console.log("AuthProvider: Auth state changed. Event:", _event, "Session:", session);
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        console.log("AuthProvider: User found in auth state change, fetching profile.");
        const profile = await fetchUserProfile(currentUser.id);
        setIsBlocked(profile?.is_blocked ?? false);
        setIsSuperAdmin(profile?.role === 'developer');
      } else {
        console.log("AuthProvider: No user found in auth state change.");
        setIsBlocked(null);
        setIsSuperAdmin(false);
      }
      setLoading(false);
      console.log("AuthProvider: Auth state change processed. isSuperAdmin:", isSuperAdmin);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // isSuperAdmin ni dependency sifatida qo'shdik, shunda u o'zgarganda useEffect qayta ishga tushadi

  const value = {
    session,
    user,
    isBlocked,
    isSuperAdmin,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
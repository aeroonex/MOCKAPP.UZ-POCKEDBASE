"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { auth, renewToken, type AuthUser } from "@/lib/api";

interface AuthContextType {
  session: { token: string } | null;
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<{ token: string } | null>(auth.token ? { token: auth.token } : null);
  const [user, setUser] = useState<AuthUser | null>(auth.model);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Sessiya o'zgarishlarini kuzatish (login/logout/yangilash)
    const unsubscribe = auth.onChange((token, model) => {
      setSession(token ? { token } : null);
      setUser(model);
    }, true);

    // Saqlangan token bo'lsa — serverdan yangi ma'lumot va yangi token olish
    if (auth.token) {
      renewToken().catch(() => undefined);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const value = { session, user, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

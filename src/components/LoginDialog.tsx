"use client";

import React, { useState, useEffect } from "react"; // Import useEffect
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/context/AuthProvider"; // Import useAuth

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginDialog: React.FC<LoginDialogProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isSuperAdmin, loading: authLoading } = useAuth(); // Get auth loading and isSuperAdmin from context

  // Reset form fields when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setPassword("");
      setAdminEmail("");
      setAdminPassword("");
      setLoading(false); // Also reset local loading state
    }
  }, [isOpen]);

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showError(error.message);
      } else {
        showSuccess(t("common.success_logged_in"));
        onClose(); // Close dialog, ProtectedRoute will handle navigation
      }
    } catch (err: any) {
      showError(err.message || t("common.login_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("Admin login jarayoni boshlandi...");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
      
      if (error) {
        console.error("Supabase kirishda xatolik:", error.message);
        showError(error.message);
        return;
      }

      // If no error, the AuthProvider will detect the session change
      // and update isSuperAdmin. ProtectedRoute will then handle navigation.
      showSuccess(t("common.logging_in_as_admin_success")); // More generic success message
      onClose(); // Close dialog, ProtectedRoute will handle navigation
      
    } catch (err: any) {
      console.error("Admin login jarayonida kutilmagan xatolik:", err.message);
      showError(err.message || t("common.admin_login_error"));
    } finally {
      setLoading(false);
      console.log("Admin login jarayoni yakunlandi.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("common.login")}</DialogTitle>
          <DialogDescription>
            {t("common.enter_credentials")}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="teacher" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="teacher">{t("common.teacher_only")}</TabsTrigger>
            <TabsTrigger value="admin">{t("common.admin_login")}</TabsTrigger>
          </TabsList>
          <TabsContent value="teacher" className="mt-4">
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">{t("common.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("common.enter_your_email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="password">{t("common.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("common.enter_your_password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? t("common.logging_in") : t("common.login")}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="admin" className="mt-4">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <Label htmlFor="admin-email">{t("common.admin_email")}</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder={t("common.enter_admin_email")}
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="admin-password">{t("common.admin_password")}</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder={t("common.enter_admin_password")}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? t("common.logging_in_as_admin") : t("common.admin_login_button")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
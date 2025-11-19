"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';

// Yangi modulli komponentlarni import qilish
import AdminUserTable from "@/components/admin/AdminUserTable";
import EditProfileDialog from "@/components/admin/EditProfileDialog";
import AddUserDialog from "@/components/admin/AddUserDialog";

interface Profile {
  id: string;
  username: string;
  role: string;
  balance: number;
  score: number;
  created_at: string;
  phone: string | null;
  bio: string | null;
  tariff_name: string;
  is_blocked: boolean;
  is_active: boolean;
  purchase_date: string;
  expiry_date: string;
  income: number;
  email?: string; // Supabase auth.users dan keladi
}

const AdminDashboard: React.FC = () => {
  const { isSuperAdmin, loading: authLoading, session } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false); // Add user loading state

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    
    const [profilesResponse, usersEdgeResponse] = await Promise.all([
      supabase.from('profiles').select('*'),
      session?.access_token 
        ? supabase.functions.invoke('list-users', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
        : Promise.resolve({ data: [], error: null }),
    ]);

    const { data: profilesData, error: profilesError } = profilesResponse;
    const { data: usersEdgeData, error: usersEdgeError } = usersEdgeResponse;

    if (profilesError) {
      showError(t("admin_dashboard.error_fetching_profiles", { message: profilesError.message }));
      setIsLoading(false);
      return;
    }

    if (usersEdgeError) {
      showError(t("admin_dashboard.error_fetching_users", { message: usersEdgeError.message }));
      setIsLoading(false);
      return;
    }
    
    let usersMap = new Map<string, string>();
    if (usersEdgeData && Array.isArray(usersEdgeData)) {
      usersEdgeData.forEach((user: any) => {
        usersMap.set(user.id, user.email);
      });
    } else if (!session?.access_token) {
      showError(t("admin_dashboard.error_no_session_for_users")); 
    }

    const combinedProfiles = profilesData.map(profile => ({
      ...profile,
      email: usersMap.get(profile.id) || t("admin_dashboard.email_not_available"),
    }));

    setProfiles(combinedProfiles);
    setIsLoading(false);
  }, [t, session]);

  useEffect(() => {
    if (!authLoading) {
      if (!isSuperAdmin) {
        showError(t("admin_dashboard.error_access_denied"));
        navigate("/home");
      } else {
        fetchProfiles();
      }
    }
  }, [isSuperAdmin, authLoading, navigate, fetchProfiles, t]);

  const handleEditClick = (profile: Profile) => {
    setCurrentProfile(profile);
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async (updatedProfile: Profile) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        username: updatedProfile.username,
        role: updatedProfile.role,
        balance: updatedProfile.balance,
        score: updatedProfile.score,
        phone: updatedProfile.phone,
        bio: updatedProfile.bio,
        tariff_name: updatedProfile.tariff_name,
        is_blocked: updatedProfile.is_blocked,
        is_active: updatedProfile.is_active,
        purchase_date: updatedProfile.purchase_date,
        expiry_date: updatedProfile.expiry_date,
        income: updatedProfile.income,
      })
      .eq('id', updatedProfile.id);

    if (error) {
      showError(t("admin_dashboard.error_updating_profile", { message: error.message }));
    } else {
      showSuccess(t("admin_dashboard.success_profile_updated"));
      fetchProfiles();
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteProfile = async (profileId: string, username: string | undefined) => {
    const { error: authError } = await supabase.auth.admin.deleteUser(profileId);

    if (authError) {
      showError(t("admin_dashboard.error_deleting_user", { message: authError.message }));
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId);

    if (profileError) {
      showError(t("admin_dashboard.error_deleting_profile", { message: profileError.message }));
    } else {
      showSuccess(t("admin_dashboard.success_user_deleted"));
      fetchProfiles();
    }
  };

  const handleAddUser = async (email: string, password: string, username: string, role: string) => {
    if (!email || !password) {
      showError(t("admin_dashboard.error_email_password_required"));
      return;
    }

    setIsAddingUser(true);
    try {
      if (!session?.access_token) {
        showError(t("admin_dashboard.error_no_session_for_users"));
        setIsAddingUser(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: JSON.stringify({
          email,
          password,
          username,
          role,
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data) {
        showSuccess(t("admin_dashboard.success_user_added", { email }));
        setIsAddUserDialogOpen(false);
        fetchProfiles();
      } else {
        showError(t("admin_dashboard.error_creating_user_no_user_data"));
      }
    } catch (error: any) {
      showError(t("admin_dashboard.error_adding_user", { message: error.message }));
    } finally {
      setIsAddingUser(false);
    }
  };

  if (authLoading || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">{t("admin_dashboard.admin_dashboard")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminUserTable
              profiles={profiles}
              isLoading={isLoading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onEditClick={handleEditClick}
              onDeleteClick={handleDeleteProfile}
              onAddUserClick={() => setIsAddUserDialogOpen(true)}
            />
          </CardContent>
        </Card>
      </main>
      <CefrCentreFooter />

      <EditProfileDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        profile={currentProfile}
        onSave={handleSaveProfile}
      />

      <AddUserDialog
        isOpen={isAddUserDialogOpen}
        onClose={() => setIsAddUserDialogOpen(false)}
        onAddUser={handleAddUser}
        isLoading={isAddingUser}
      />
    </div>
  );
};

export default AdminDashboard;
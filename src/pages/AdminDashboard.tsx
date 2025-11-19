"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false); // New state for Add User dialog
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    role: "",
    balance: 0,
    score: 0,
    phone: "",
    bio: "",
    tariff_name: "",
    is_blocked: false,
    is_active: false,
    purchase_date: "",
    expiry_date: "",
    income: 0,
  });
  const [newUserData, setNewUserData] = useState({ // New state for Add User form
    email: "",
    password: "",
    username: "",
    role: "user",
  });

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    
    const [profilesResponse, usersEdgeResponse] = await Promise.all([
      supabase.from('profiles').select('*'),
      session?.access_token 
        ? supabase.functions.invoke('list-users', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
        : Promise.resolve({ data: [], error: null }), // Handle no session case gracefully
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
      // This case should ideally be handled by the Promise.resolve above,
      // but keeping it for explicit error messaging if needed.
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
    setEditForm({
      username: profile.username || "",
      role: profile.role || "user",
      balance: profile.balance || 0,
      score: profile.score || 0,
      phone: profile.phone || "",
      bio: profile.bio || "",
      tariff_name: profile.tariff_name || "Basic",
      is_blocked: profile.is_blocked,
      is_active: profile.is_active,
      purchase_date: profile.purchase_date ? format(parseISO(profile.purchase_date), 'yyyy-MM-dd') : '',
      expiry_date: profile.expiry_date ? format(parseISO(profile.expiry_date), 'yyyy-MM-dd') : '',
      income: profile.income || 0,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!currentProfile) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        username: editForm.username,
        role: editForm.role,
        balance: editForm.balance,
        score: editForm.score,
        phone: editForm.phone,
        bio: editForm.bio,
        tariff_name: editForm.tariff_name,
        is_blocked: editForm.is_blocked,
        is_active: editForm.is_active,
        purchase_date: editForm.purchase_date,
        expiry_date: editForm.expiry_date,
        income: editForm.income,
      })
      .eq('id', currentProfile.id);

    if (error) {
      showError(t("admin_dashboard.error_updating_profile", { message: error.message }));
    } else {
      showSuccess(t("admin_dashboard.success_profile_updated"));
      fetchProfiles();
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
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

  const handleAddUserSubmit = async () => {
    if (!newUserData.email || !newUserData.password) {
      showError(t("admin_dashboard.error_email_password_required"));
      return;
    }

    try {
      if (!session?.access_token) {
        showError(t("admin_dashboard.error_no_session_for_users"));
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: JSON.stringify({
          email: newUserData.email,
          password: newUserData.password,
          username: newUserData.username,
          role: newUserData.role,
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
        showSuccess(t("admin_dashboard.success_user_added", { email: newUserData.email }));
        setIsAddUserDialogOpen(false);
        setNewUserData({ email: "", password: "", username: "", role: "user" }); // Reset form
        fetchProfiles(); // Refresh the list
      } else {
        showError(t("admin_dashboard.error_creating_user_no_user_data"));
      }
    } catch (error: any) {
      showError(t("admin_dashboard.error_adding_user", { message: error.message }));
    }
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="mb-4 flex justify-between items-center">
              <Input
                placeholder={t("admin_dashboard.search_users")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={() => setIsAddUserDialogOpen(true)}>{t("admin_dashboard.add_new_user")}</Button>
            </div>

            {isLoading ? (
              <p className="text-center">{t("common.loading")}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin_dashboard.id")}</TableHead>
                      <TableHead>{t("admin_dashboard.email")}</TableHead>
                      <TableHead>{t("admin_dashboard.username")}</TableHead>
                      <TableHead>{t("admin_dashboard.role")}</TableHead>
                      <TableHead>{t("admin_dashboard.balance")}</TableHead>
                      <TableHead>{t("admin_dashboard.score")}</TableHead>
                      <TableHead>{t("admin_dashboard.tariff")}</TableHead>
                      <TableHead>{t("admin_dashboard.blocked")}</TableHead>
                      <TableHead>{t("admin_dashboard.active")}</TableHead>
                      <TableHead>{t("admin_dashboard.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.id.substring(0, 8)}...</TableCell>
                        <TableCell>{profile.email}</TableCell>
                        <TableCell>{profile.username}</TableCell>
                        <TableCell>{profile.role}</TableCell>
                        <TableCell>{profile.balance}</TableCell>
                        <TableCell>{profile.score}</TableCell>
                        <TableCell>{profile.tariff_name}</TableCell>
                        <TableCell>{profile.is_blocked ? t("common.yes") : t("common.no")}</TableCell>
                        <TableCell>{profile.is_active ? t("common.yes") : t("common.no")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditClick(profile)}>
                              {t("common.edit")}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  {t("common.delete")}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("admin_dashboard.confirm_delete_user")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("admin_dashboard.delete_user_warning", { username: profile.username || profile.email })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProfile(profile.id)}>{t("common.delete")}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <CefrCentreFooter />

      {currentProfile && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t("admin_dashboard.edit_profile_for", { username: currentProfile.username || currentProfile.email })}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-username" className="text-right">{t("admin_dashboard.username")}</Label>
                <Input
                  id="edit-username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">{t("admin_dashboard.role")}</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("admin_dashboard.select_role")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t("admin_dashboard.role_user")}</SelectItem>
                    <SelectItem value="teacher">{t("admin_dashboard.role_teacher")}</SelectItem>
                    <SelectItem value="developer">{t("admin_dashboard.role_developer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-balance" className="text-right">{t("admin_dashboard.balance")}</Label>
                <Input
                  id="edit-balance"
                  type="number"
                  value={editForm.balance}
                  onChange={(e) => setEditForm({ ...editForm, balance: parseFloat(e.target.value) || 0 })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-score" className="text-right">{t("admin_dashboard.score")}</Label>
                <Input
                  id="edit-score"
                  type="number"
                  value={editForm.score}
                  onChange={(e) => setEditForm({ ...editForm, score: parseFloat(e.target.value) || 0 })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right">{t("admin_dashboard.phone")}</Label>
                <Input
                  id="edit-phone"
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-bio" className="text-right">{t("admin_dashboard.bio")}</Label>
                <Input
                  id="edit-bio"
                  type="text"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-tariff" className="text-right">{t("admin_dashboard.tariff")}</Label>
                <Input
                  id="edit-tariff"
                  type="text"
                  value={editForm.tariff_name}
                  onChange={(e) => setEditForm({ ...editForm, tariff_name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-purchase-date" className="text-right">{t("admin_dashboard.purchase_date")}</Label>
                <Input
                  id="edit-purchase-date"
                  type="date"
                  value={editForm.purchase_date}
                  onChange={(e) => setEditForm({ ...editForm, purchase_date: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-expiry-date" className="text-right">{t("admin_dashboard.expiry_date")}</Label>
                <Input
                  id="edit-expiry-date"
                  type="date"
                  value={editForm.expiry_date}
                  onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-income" className="text-right">{t("admin_dashboard.income")}</Label>
                <Input
                  id="edit-income"
                  type="number"
                  value={editForm.income}
                  onChange={(e) => setEditForm({ ...editForm, income: parseFloat(e.target.value) || 0 })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-blocked" className="text-right">{t("admin_dashboard.blocked")}</Label>
                <Switch
                  id="edit-blocked"
                  checked={editForm.is_blocked}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_blocked: checked })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-active" className="text-right">{t("admin_dashboard.active")}</Label>
                <Switch
                  id="edit-active"
                  checked={editForm.is_active}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveProfile}>{t("common.save_changes")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add New User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("admin_dashboard.add_new_user")}</DialogTitle>
            <DialogDescription>{t("admin_dashboard.add_new_user_description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-user-email" className="text-right">{t("common.email")}</Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                className="col-span-3"
                placeholder={t("admin_dashboard.new_user_email_placeholder")}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-user-password" className="text-right">{t("common.password")}</Label>
              <Input
                id="new-user-password"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                className="col-span-3"
                placeholder={t("admin_dashboard.new_user_password_placeholder")}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-user-username" className="text-right">{t("admin_dashboard.username")}</Label>
              <Input
                id="new-user-username"
                type="text"
                value={newUserData.username}
                onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                className="col-span-3"
                placeholder={t("admin_dashboard.new_user_username_placeholder")}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-user-role" className="text-right">{t("admin_dashboard.role")}</Label>
              <Select value={newUserData.role} onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t("admin_dashboard.select_role")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t("admin_dashboard.role_user")}</SelectItem>
                  <SelectItem value="teacher">{t("admin_dashboard.role_teacher")}</SelectItem>
                  <SelectItem value="developer">{t("admin_dashboard.role_developer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddUserSubmit}>{t("admin_dashboard.add_user_button")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
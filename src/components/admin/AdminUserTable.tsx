"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from 'react-i18next';
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
  email?: string;
}

interface AdminUserTableProps {
  profiles: Profile[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onEditClick: (profile: Profile) => void;
  onDeleteClick: (profileId: string, username: string | undefined) => void;
  onAddUserClick: () => void;
}

const AdminUserTable: React.FC<AdminUserTableProps> = ({
  profiles,
  isLoading,
  searchTerm,
  setSearchTerm,
  onEditClick,
  onDeleteClick,
  onAddUserClick,
}) => {
  const { t } = useTranslation();

  const filteredProfiles = profiles.filter(profile =>
    profile.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <Input
          placeholder={t("admin_dashboard.search_users")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={onAddUserClick}>{t("admin_dashboard.add_new_user")}</Button>
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
                      <Button variant="outline" size="sm" onClick={() => onEditClick(profile)}>
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
                            <AlertDialogAction onClick={() => onDeleteClick(profile.id, profile.username || profile.email)}>{t("common.delete")}</AlertDialogAction>
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
    </>
  );
};

export default AdminUserTable;
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from 'react-i18next';

interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (email: string, password: string, username: string, role: string) => void;
  isLoading: boolean;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({
  isOpen,
  onClose,
  onAddUser,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    username: "",
    role: "user",
  });

  const handleSubmit = () => {
    onAddUser(newUserData.email, newUserData.password, newUserData.username, newUserData.role);
    setNewUserData({ email: "", password: "", username: "", role: "user" }); // Reset form
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? t("common.loading") : t("admin_dashboard.add_user_button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';

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

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSave: (updatedProfile: Profile) => void;
}

const EditProfileDialog: React.FC<EditProfileDialogProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
}) => {
  const { t } = useTranslation();
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

  useEffect(() => {
    if (profile) {
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
    }
  }, [profile]);

  const handleSave = () => {
    if (profile) {
      onSave({
        ...profile,
        ...editForm,
        balance: parseFloat(String(editForm.balance)), // Ensure number type
        score: parseFloat(String(editForm.score)),     // Ensure number type
        income: parseFloat(String(editForm.income)),   // Ensure number type
      });
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("admin_dashboard.edit_profile_for", { username: profile.username || profile.email })}</DialogTitle>
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
          <Button onClick={handleSave}>{t("common.save_changes")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
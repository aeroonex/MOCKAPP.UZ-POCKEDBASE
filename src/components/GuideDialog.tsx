"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';

interface GuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideDialog: React.FC<GuideDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("guide_dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("guide_dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <p><strong>1. {t("guide_dialog.rule1_title")}</strong> {t("guide_dialog.rule1_text")}</p>
          <p><strong>2. {t("guide_dialog.rule2_title")}</strong> {t("guide_dialog.rule2_text")}</p>
          <p><strong>3. {t("guide_dialog.rule3_title")}</strong> {t("guide_dialog.rule3_text")}</p>
          <p><strong>4. {t("guide_dialog.rule4_title")}</strong> {t("guide_dialog.rule4_text")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuideDialog;
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
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border bg-background/80 backdrop-blur-md shadow-2xl">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400" />
        <div className="p-6">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {t("guide_dialog.title")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {t("guide_dialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-3 text-sm text-foreground">
            <div className="rounded-xl border bg-card/50 p-4">
              <p className="font-semibold">1. {t("guide_dialog.rule1_title")}</p>
              <p className="mt-1 text-muted-foreground">{t("guide_dialog.rule1_text")}</p>
            </div>
            <div className="rounded-xl border bg-card/50 p-4">
              <p className="font-semibold">2. {t("guide_dialog.rule2_title")}</p>
              <p className="mt-1 text-muted-foreground">{t("guide_dialog.rule2_text")}</p>
            </div>
            <div className="rounded-xl border bg-card/50 p-4">
              <p className="font-semibold">3. {t("guide_dialog.rule3_title")}</p>
              <p className="mt-1 text-muted-foreground">{t("guide_dialog.rule3_text")}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuideDialog;
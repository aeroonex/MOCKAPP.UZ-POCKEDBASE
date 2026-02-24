"use client";

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Search,
  ShoppingCart,
  ListChecks,
  Menu,
  User,
  Settings as SettingsIcon,
  Info,
  LogOut,
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface MobileBottomNavbarProps {
  handleLogout: () => void;
  setIsGuideDialogOpen: (isOpen: boolean) => void;
  isGuestMode: boolean;
  session: any;
}

const MobileBottomNavbar: React.FC<MobileBottomNavbarProps> = ({
  handleLogout,
  setIsGuideDialogOpen,
  isGuestMode,
  session,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  if (!isMobile) {
    return null;
  }

  const primaryItems = [
    { icon: Home, label: t("common.home"), path: "/home", action: () => navigate("/home") },
    { icon: Search, label: t("home_page.questions"), path: "/questions", action: () => navigate("/questions") },
    { icon: ListChecks, label: t("home_page.mock_test"), path: "/mock-test", action: () => navigate("/mock-test") },
    { icon: ShoppingCart, label: t("home_page.records"), path: "/records", action: () => navigate("/records") },
  ];

  return (
    <div className="button-container">
      {primaryItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            className={cn("button", isActive ? "active-button" : "")}
            onClick={item.action}
            aria-label={item.label}
          >
            <item.icon className="icon" />
          </button>
        );
      })}

      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetTrigger asChild>
          <button
            className={cn(
              "button",
              ["/user-profile", "/settings"].includes(location.pathname) ? "active-button" : ""
            )}
            aria-label="More"
          >
            <Menu className="icon" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => {
                setIsMoreOpen(false);
                navigate("/user-profile");
              }}
            >
              <User className="h-4 w-4" />
              {t("common.profile")}
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => {
                setIsMoreOpen(false);
                navigate("/settings");
              }}
            >
              <SettingsIcon className="h-4 w-4" />
              {t("common.settings")}
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => {
                setIsMoreOpen(false);
                setIsGuideDialogOpen(true);
              }}
            >
              <Info className="h-4 w-4" />
              {t("common.guide")}
            </Button>
            <Button
              variant="destructive"
              className="justify-start gap-2"
              onClick={async () => {
                setIsMoreOpen(false);
                await handleLogout();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              {isGuestMode && !session ? t("common.guest_mode_exit") : t("common.logout")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileBottomNavbar;
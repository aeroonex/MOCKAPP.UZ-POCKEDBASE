"use client";

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, User, ShoppingCart } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const MobileBottomNavbar: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) {
    return null;
  }

  const navItems = [
    { icon: Home, label: t("common.home"), path: "/home" },
    { icon: Search, label: t("home_page.questions"), path: "/questions" },
    { icon: User, label: t("common.profile"), path: "/user-profile" },
    { icon: ShoppingCart, label: t("home_page.records"), path: "/records" },
  ];

  return (
    <div className="button-container">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            className={cn("button", isActive ? "active-button" : "")}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
          >
            <item.icon className="icon" />
          </button>
        );
      })}
    </div>
  );
};

export default MobileBottomNavbar;
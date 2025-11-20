"use client";

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, User, Settings, Home as HomeIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const allNavLinks = [
  { name: "common.home", path: "/home", icon: HomeIcon, protected: true },
  { name: "common.settings", path: "/settings", icon: Settings, protected: true },
  { name: "common.profile", path: "/user-profile", icon: User, protected: true },
];

const Navbar: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { session } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true";
  const { t } = useTranslation();

  const handleLogout = async () => {
    if (session) {
      await supabase.auth.signOut();
      showSuccess(t("common.success_logged_in"));
    } else if (isGuestMode) {
      localStorage.removeItem("isGuestMode");
      showSuccess(t("common.success_guest_mode_exited"));
    }
    navigate("/login");
  };

  const renderNavLinks = () => {
    let filteredLinks = allNavLinks;

    if (isGuestMode && !session) {
      filteredLinks = allNavLinks.filter(link => link.path === '/home');
    }

    return (
      <>
        {filteredLinks.map((link) => (
          <Button key={link.name} variant="ghost" asChild className="w-full justify-start hover:bg-primary/80">
            <Link to={link.path} className="flex items-center gap-2">
              <link.icon className="h-4 w-4" />
              {t(link.name)}
            </Link>
          </Button>
        ))}
        {(session || isGuestMode) && (
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-primary/20 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isGuestMode && !session ? t("common.guest_mode_exit") : t("common.logout")}
          </Button>
        )}
      </>
    );
  };

  return (
    <nav className="bg-primary text-white p-4 shadow-md flex items-center justify-between">
      <Link to="/home" className="text-2xl font-bold">
        <span className="font-extrabold">Edumock.uz</span>
      </Link>

      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-primary/80">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] p-4 flex flex-col bg-primary text-white border-r-primary/80">
            <Link to="/home" className="text-2xl font-bold mb-4">
              <span className="font-extrabold">Edumock.uz</span>
            </Link>
            <div className="flex flex-col gap-2">
              {renderNavLinks()}
            </div>
            <div className="mt-4">
              <LanguageSwitcher />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <div className="flex items-center gap-4">
          {renderNavLinks()}
          <LanguageSwitcher />
        </div>
      )}
    </nav>
  );
};

export default Navbar;
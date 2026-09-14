"use client";

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, User, Settings, Home as HomeIcon, ListChecks, Video, PlusCircle, Book } from "lucide-react";
import { isStationHost, stationCenterName } from "@/lib/station";
import { useIsMobile } from "@/hooks/use-mobile";
import { showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthProvider";
import { auth } from "@/lib/api";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const allNavLinks = [
  { name: "common.home", path: "/home", icon: HomeIcon, protected: true },
  { name: "common.settings", path: "/settings", icon: Settings, protected: true },
  { name: "common.profile", path: "/user-profile", icon: User, protected: true },
];

// Imtihon stansiyasi: faqat kerakli bo'limlar
const stationNavLinks = [
  { name: "common.home", path: "/home", icon: HomeIcon, protected: true },
  { name: "home_page.mock_test", path: "/mock-test", icon: ListChecks, protected: true },
  { name: "home_page.questions", path: "/questions", icon: Book, protected: true },
  { name: "home_page.add_question", path: "/add-question", icon: PlusCircle, protected: true },
  { name: "home_page.records", path: "/records", icon: Video, protected: true },
];

const Navbar: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { session } = useAuth();
  const station = isStationHost();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true" && !station;
  const { t } = useTranslation();

  const handleLogout = async () => {
    if (session) {
      auth.clear();
      showSuccess(t("common.logout"));
    } else if (isGuestMode) {
      localStorage.removeItem("isGuestMode");
      sessionStorage.removeItem("guestWelcomeToastShown"); // Belgini o'chirish
      showSuccess(t("common.success_guest_mode_exited"));
    }
    navigate("/login");
  };

  const renderNavLinks = () => {
    let filteredLinks = station ? stationNavLinks : allNavLinks;

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
    <nav className="bg-primary text-white px-3 py-3 sm:p-4 shadow-md flex items-center justify-between">
      <Link to="/home" className="text-lg sm:text-2xl font-bold">
        <span className="font-extrabold">Edumock.uz</span>
        {station && <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] sm:text-xs font-semibold align-middle">CEFR · {stationCenterName() || t("station.title")}</span>}
      </Link>

      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-primary/80">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[260px] p-4 flex flex-col bg-primary text-white border-r-primary/80">
            <Link to="/home" className="text-xl font-bold mb-4">
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
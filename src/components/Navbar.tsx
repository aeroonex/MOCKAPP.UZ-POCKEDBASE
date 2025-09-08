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

const allNavLinks = [
  { name: "Home", path: "/home", icon: HomeIcon, protected: true },
  { name: "Settings", path: "/settings", icon: Settings, protected: true },
  { name: "Profile", path: "/user-profile", icon: User, protected: true },
];

const Navbar: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { session } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true";

  const handleLogout = async () => {
    if (session) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("isGuestMode");
    showSuccess("Tizimdan chiqdingiz!");
    navigate("/login");
  };

  const renderNavLinks = () => {
    let filteredLinks = allNavLinks;

    if (isGuestMode && !session) {
      // Mehmon rejimida faqat "Home" ko'rinsin
      filteredLinks = allNavLinks.filter(link => link.path === '/home');
    }

    return (
      <>
        {filteredLinks.map((link) => (
          <Button key={link.name} variant="ghost" asChild className="w-full justify-start hover:bg-red-700">
            <Link to={link.path} className="flex items-center gap-2">
              <link.icon className="h-4 w-4" />
              {link.name}
            </Link>
          </Button>
        ))}
        {(session || isGuestMode) && (
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-red-500/20 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isGuestMode && !session ? "Guest Mode'dan chiqish" : "Logout"}
          </Button>
        )}
      </>
    );
  };

  return (
    <nav className="bg-red-600 text-white p-4 shadow-md flex items-center justify-between">
      <Link to="/home" className="text-2xl font-bold">
        <span className="font-extrabold">CEFR LC</span>
      </Link>

      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-red-700">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] p-4 flex flex-col bg-red-600 text-white border-r-red-700">
            <Link to="/home" className="text-2xl font-bold mb-4">
              <span className="font-extrabold">CEFR LC</span>
            </Link>
            <div className="flex flex-col gap-2">
              {renderNavLinks()}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <div className="flex items-center gap-4">
          {renderNavLinks()}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
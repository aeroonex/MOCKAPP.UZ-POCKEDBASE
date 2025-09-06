"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, User, Settings, Home as HomeIcon, ListChecks, ImagePlus, BookOpen, Video } from "lucide-react"; // Import ImagePlus icon
import { useIsMobile } from "@/hooks/use-mobile";

const navLinks = [
  { name: "Home", path: "/home", icon: HomeIcon },
  { name: "Questions", path: "/questions", icon: BookOpen },
  { name: "Add Question", path: "/add-question", icon: ImagePlus }, // Changed icon here
  { name: "Tests", path: "/tests", icon: ListChecks },
  { name: "Mock Test", path: "/mock-test", icon: ListChecks },
  { name: "Records", path: "/records", icon: Video },
  { name: "Settings", path: "/settings", icon: Settings },
  { name: "Profile", path: "/user-profile", icon: User },
];

const Navbar: React.FC = () => {
  const isMobile = useIsMobile();

  const renderNavLinks = () => (
    <>
      {navLinks.map((link) => (
        <Button key={link.name} variant="ghost" asChild className="w-full justify-start">
          <Link to={link.path} className="flex items-center gap-2">
            <link.icon className="h-4 w-4" />
            {link.name}
          </Link>
        </Button>
      ))}
      <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive">
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>
    </>
  );

  return (
    <nav className="bg-primary text-primary-foreground p-4 shadow-md flex items-center justify-between">
      <Link to="/home" className="text-2xl font-bold">
        <span className="font-extrabold text-red-500">CEFR LC</span>
      </Link>

      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] p-4 flex flex-col">
            <Link to="/home" className="text-2xl font-bold mb-4">
              <span className="font-extrabold text-red-500">CEFR LC</span>
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
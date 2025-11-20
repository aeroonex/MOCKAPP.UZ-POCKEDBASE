"use client";

import React from "react";
import { User } from "lucide-react";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';

interface LandingPageHeaderProps {
  onOpenLogin: () => void;
}

const LandingPageHeader: React.FC<LandingPageHeaderProps> = ({ onOpenLogin }) => {
  const { t } = useTranslation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm"> {/* bg-white/80 -> bg-background/80, border-gray-100 -> border-border */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-14">
        <div className="flex items-center">
          <a href="#" className="text-xl font-bold text-foreground">Edumock<span className="text-primary">.uz</span></a> {/* text-gray-900 -> text-foreground */}
        </div>
        <div className="flex items-center space-x-3">
          <a href="#" className="hidden sm:inline-block px-4 py-2 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition duration-150 text-sm">
            Edumock Plus
          </a>
          <LanguageSwitcher />
          <ThemeToggle />
          <button onClick={onOpenLogin} className="text-primary hover:text-primary/80">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default LandingPageHeader;
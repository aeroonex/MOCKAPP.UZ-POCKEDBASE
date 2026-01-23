"use client";

import React from "react";
import { User } from "lucide-react";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button'; // Button komponentini import qilish

interface LandingPageHeaderProps {
  onOpenLogin: () => void;
}

const LandingPageHeader: React.FC<LandingPageHeaderProps> = ({ onOpenLogin }) => {
  const { t } = useTranslation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-14">
        <div className="flex items-center space-x-4"> {/* space-x-4 qo'shildi */}
          <a href="#" className="text-xl font-bold text-foreground">Edumock<span className="text-primary">.uz</span></a>
          <Button asChild
            className="group relative bg-slate-900 h-16 w-64 border-2 border-teal-600 text-white text-base font-bold rounded-xl overflow-hidden transform transition-all duration-500 hover:scale-105 hover:border-emerald-400 hover:text-emerald-300 p-3 text-left before:absolute before:w-10 before:h-10 before:content-[''] before:right-2 before:top-2 before:z-10 before:bg-indigo-500 before:rounded-full before:blur-lg before:transition-all before:duration-500 after:absolute after:z-10 after:w-16 after:h-16 after:content-[''] after:bg-teal-400 after:right-6 after:top-4 after:rounded-full after:blur-lg after:transition-all after:duration-500 hover:before:right-10 hover:before:-bottom-4 hover:before:blur hover:after:-right-6 hover:after:scale-110"
          >
            <a href="https://speakify.uz" target="_blank" rel="noopener noreferrer" className="flex items-center">
              <span className="text-white group-hover:text-emerald-300">One</span><span className="text-green-500 group-hover:text-emerald-300">X</span> Projects
            </a>
          </Button>
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
"use client";

import React from "react";
import { User } from "lucide-react";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button'; // Button komponentini import qilish
import '../styles/PremiumButton.css'; // Yangi tugma stillarini import qilish

interface LandingPageHeaderProps {
  onOpenLogin: () => void;
}

const LandingPageHeader: React.FC<LandingPageHeaderProps> = ({ onOpenLogin }) => {
  const { t } = useTranslation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex justify-between items-center h-14">
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
          <a href="#" className="text-lg sm:text-xl font-bold text-foreground truncate">Edumock<span className="text-primary">.uz</span></a>
          <Button
            asChild
            className="hidden md:inline-flex group relative bg-slate-900 h-10 w-40 border-2 border-teal-600 text-white text-sm font-bold rounded-xl overflow-hidden transform transition-all duration-500 hover:scale-105 hover:border-emerald-400 hover:text-emerald-300 p-2 text-left before:absolute before:w-6 before:h-6 before:content-[''] before:right-1 before:top-1 before:z-10 before:bg-indigo-500 before:rounded-full before:blur-lg before:transition-all before:duration-500 after:absolute after:z-10 after:w-8 after:h-8 after:content-[''] after:bg-teal-400 after:right-3 after:top-2 after:rounded-full after:blur-lg after:transition-all after:duration-500 hover:before:right-6 hover:before:-bottom-2 hover:before:blur hover:after:-right-3 hover:after:scale-110"
          >
            <a href="https://speakify.uz" target="_blank" rel="noopener noreferrer" className="flex items-center">
              <span className="text-white group-hover:text-emerald-300">One</span>
              <span className="text-green-500 group-hover:text-emerald-300">X</span>
              <span className="ml-1">Projects</span>
            </a>
          </Button>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden sm:block">
            <button className="Btn"> 
              <svg viewBox="0 0 576 512" height="1em" className="logoIcon"><path d="M309 106c11.4-7 19-19.7 19-34c0-22.1-17.9-40-40-40s-40 17.9-40 40c0 14.4 7.6 27 19 34L209.7 220.6c-9.1 18.2-32.7 23.4-48.6 10.7L72 160c5-6.7 8-15 8-24c0-22.1-17.9-40-40-40S0 113.9 0 136s17.9 40 40 40c.2 0 .5 0 .7 0L86.4 427.4c5.5 30.4 32 52.6 63 52.6H426.6c30.9 0 57.4-22.1 63-52.6L535.3 176c.2 0 .5 0 .7 0c22.1 0 40-17.9 40-40s-17.9-40-40-40s-40 17.9-40 40c0 9 3 17.3 8 24l-89.1 71.3c-15.9 12.7-39.5 7.5-48.6-10.7L309 106z"></path></svg>
              GO PREMIUM
            </button>
          </div>
          <LanguageSwitcher />
          <ThemeToggle />
          <button onClick={onOpenLogin} className="text-primary hover:text-primary/80 p-1">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default LandingPageHeader;
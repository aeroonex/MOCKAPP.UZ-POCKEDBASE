"use client";

import React from "react";
import { User } from "lucide-react";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher'; // LanguageSwitcher'ni import qilish

interface LandingPageHeaderProps {
  onOpenLogin: () => void;
}

const LandingPageHeader: React.FC<LandingPageHeaderProps> = ({ onOpenLogin }) => {
  const { t } = useTranslation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <div className="flex items-center">
          <a href="#" className="text-2xl font-bold text-gray-900">Edumock<span className="text-primary">.uz</span></a>
        </div>
        <div className="flex items-center space-x-3">
          <a href="#" className="hidden sm:inline-block px-4 py-2 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition duration-150 text-sm">
            Edumock Plus
          </a>
          {/* Static "UZ" span o'rniga LanguageSwitcher komponentini qo'shdim */}
          <LanguageSwitcher />
          <button onClick={onOpenLogin} className="text-primary hover:text-primary/80">
            <User className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default LandingPageHeader;
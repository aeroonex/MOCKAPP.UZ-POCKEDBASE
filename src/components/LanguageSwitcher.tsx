"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Globe endi kerak emas

interface LanguageInfo {
  name: string;
  flag: string;
}

const languageMap: Record<string, LanguageInfo> = {
  en: { name: 'English', flag: '🇺🇸' },
  ru: { name: 'Русский', flag: '🇷🇺' },
  tr: { name: 'Türkçe', flag: '🇹🇷' },
  ar: { name: 'العربية', flag: '🇸🇦' },
};

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const currentLangInfo = languageMap[currentLang] || languageMap.en; // Agar topilmasa, sukut bo'yicha ingliz tilini tanlash

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-700 hover:text-lime-500 flex items-center gap-2 px-3 py-2 rounded-md group">
          <span
            aria-hidden="true"
            className="text-base leading-none transition-transform duration-300 group-hover:scale-110"
          >
            {currentLangInfo.flag}
          </span>
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200">
            {currentLangInfo.name}
          </span>
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {Object.entries(languageMap).map(([langCode, info]) => (
          <DropdownMenuItem key={langCode} onClick={() => changeLanguage(langCode)} className="flex items-center gap-2 cursor-pointer">
            <span aria-hidden="true" className="text-base leading-none">
              {info.flag}
            </span>
            <span>{info.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
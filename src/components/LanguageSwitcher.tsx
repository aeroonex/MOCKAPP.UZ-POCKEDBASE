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
  flagUrl: string;
}

const languageMap: Record<string, LanguageInfo> = {
  en: { name: 'English', flagUrl: 'https://flagcdn.com/w20/us.png' }, // AQSh bayrog'i ingliz tili uchun
  ru: { name: 'Русский', flagUrl: 'https://flagcdn.com/w20/ru.png' },
  tr: { name: 'Türkçe', flagUrl: 'https://flagcdn.com/w20/tr.png' },
  ar: { name: 'العربية', flagUrl: 'https://flagcdn.com/w20/sa.png' }, // Saudiya Arabistoni bayrog'i arab tili uchun
};

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;
  const currentLangInfo = languageMap[currentLang] || languageMap.en; // Agar topilmasa, sukut bo'yicha ingliz tilini tanlash

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-700 hover:text-lime-500 flex items-center gap-2 px-3 py-2 rounded-md group">
          <img
            src={currentLangInfo.flagUrl}
            alt={`${currentLangInfo.name} Flag`}
            className="h-4 w-auto rounded-sm shadow-md flag-icon transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/50"
          />
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200">
            {currentLangInfo.name}
          </span>
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {Object.entries(languageMap).map(([langCode, info]) => (
          <DropdownMenuItem key={langCode} onClick={() => changeLanguage(langCode)} className="flex items-center gap-2 cursor-pointer">
            <img
              src={info.flagUrl}
              alt={`${info.name} Flag`}
              className="h-4 w-auto rounded-sm shadow-sm flag-icon transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/50"
            />
            <span>{info.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
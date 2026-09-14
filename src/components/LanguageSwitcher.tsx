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
import { Globe } from 'lucide-react';

interface LanguageInfo {
  name: string;
  code: string;
}

// Bayroq emojilari Windows'da ko'rsatilmaydi — o'rniga globus ikonka va til kodi.
const languageMap: Record<string, LanguageInfo> = {
  uz: { name: "O'zbekcha", code: 'UZ' },
  en: { name: 'English', code: 'EN' },
  ru: { name: 'Русский', code: 'RU' },
  tr: { name: 'Türkçe', code: 'TR' },
  ar: { name: 'العربية', code: 'AR' },
};

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const currentLangInfo = languageMap[currentLang] || languageMap.uz; // Agar topilmasa, sukut bo'yicha o'zbek tilini tanlash

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1.5 rounded-full px-2.5 py-2 group sm:px-3">
          <Globe aria-hidden="true" className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:rotate-12" />
          <span className="hidden text-sm font-semibold text-foreground sm:inline">{currentLangInfo.name}</span>
          <span className="text-xs font-bold text-foreground sm:hidden">{currentLangInfo.code}</span>
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {Object.entries(languageMap).map(([langCode, info]) => (
          <DropdownMenuItem key={langCode} onClick={() => changeLanguage(langCode)} className="flex items-center gap-2.5 cursor-pointer">
            <span className="w-7 rounded-md bg-muted px-1 py-0.5 text-center text-[10px] font-bold text-muted-foreground">{info.code}</span>
            <span>{info.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
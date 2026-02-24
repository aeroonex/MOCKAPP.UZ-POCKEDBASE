"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface RotatingTextProps {
  type: 'title' | 'subtitle';
}

const RotatingText: React.FC<RotatingTextProps> = ({ type }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  const texts = {
    title: [
      { lang: 'en', text: t("landing_page.title_part2") },
      { lang: 'ru', text: t("landing_page.title_part2", { lng: 'ru' }) },
      { lang: 'tr', text: t("landing_page.title_part2", { lng: 'tr' }) },
      { lang: 'ar', text: t("landing_page.title_part2", { lng: 'ar' }) },
    ],
    subtitle: [
      { lang: 'en', text: t("landing_page.subtitle") },
      { lang: 'ru', text: t("landing_page.subtitle", { lng: 'ru' }) },
      { lang: 'tr', text: t("landing_page.subtitle", { lng: 'tr' }) },
      { lang: 'ar', text: t("landing_page.subtitle", { lng: 'ar' }) },
    ],
  };

  const currentTextArray = texts[type];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % currentTextArray.length);
    }, 2200);

    return () => clearInterval(interval);
  }, [currentTextArray.length]);

  const currentLang = currentTextArray[currentIndex].lang;

  return (
    <span
      className={cn(
        "relative inline-flex align-baseline",
        type === 'title'
          ? "min-h-[2.6em] sm:min-h-[1.6em]"
          : "min-h-[1.6em]"
      )}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={cn(
            "relative inline-flex items-center",
            type === 'title'
              ? "text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400"
              : "text-foreground",
            currentLang === 'ru' && type === 'title' && 'text-2xl sm:text-3xl lg:text-4xl'
          )}
        >
          {type === 'title' ? (
            <>
              <span className="absolute -inset-x-2 -bottom-1 h-2 rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 opacity-25 blur-sm" />
              <span className="relative leading-tight">{currentTextArray[currentIndex].text}</span>
            </>
          ) : (
            <span className="rounded-full border bg-background/40 px-3 py-1 text-sm sm:text-base font-semibold backdrop-blur-sm shadow-sm">
              {currentTextArray[currentIndex].text}
            </span>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default RotatingText;
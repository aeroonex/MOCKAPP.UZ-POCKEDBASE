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
    }, 2000); // Har 2 soniyada o'zgaradi

    return () => clearInterval(interval);
  }, [currentTextArray.length]);

  // Konteyner uchun responsiv o'lchamlarni aniqlash
  // Bu balandliklar ota-elementlardagi h1/p elementlarining line-height qiymatlariga asoslangan.
  // Tailwind CSS ning default `leading-tight` qiymatlari asosida hisoblangan.
  const containerDimensions = {
    // `h` qiymatlari `h1` va `p` teglarining `line-height` qiymatlariga mos keladi.
    // `min-w` qiymatlari eng uzun tarjimani sig'dira olishi uchun oshirildi.
    title: "h-[2.5rem] sm:h-[3rem] lg:h-[3.75rem] min-w-[250px] sm:min-w-[350px] lg:min-w-[600px]",
    subtitle: "h-[1.75rem] sm:h-[2.25rem] min-w-[150px] sm:min-w-[300px]",
  };

  const currentLang = currentTextArray[currentIndex].lang;

  return (
    <div className={cn("relative inline-block", containerDimensions[type])}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className={cn(
            "absolute left-0 top-0 w-full h-full flex items-center justify-start whitespace-nowrap",
            {
              // Rus tilidagi sarlavha uchun kichikroq shrift o'lchamlarini qo'llash
              'text-3xl sm:text-4xl lg:text-4xl': currentLang === 'ru' && type === 'title',
            }
          )}
        >
          {currentTextArray[currentIndex].text}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export default RotatingText;
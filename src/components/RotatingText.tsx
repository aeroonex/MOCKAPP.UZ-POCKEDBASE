"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

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

  return (
    <div className="relative h-auto overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="inline-block"
        >
          {currentTextArray[currentIndex].text}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export default RotatingText;
"use client";

import React, { useMemo } from "react";

const CHARS = [
  "Aa", "Bb", "Cc", "Dd", "Ee", "Ff", "Gg", "Hh", "Ii", "Jj", "Kk", "Ll", "Mm",
  "Nn", "Oo", "Pp", "Qq", "Rr", "Ss", "Tt", "Uu", "Vv", "Ww", "Xx", "Yy", "Zz",
  "O'", "G'", "Sh", "Ch", "Ng",
  "ع", "ض", "ص", "ث", "ق", "ف", "غ", "ه", "خ", "ح", "ج", "ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك",
  "Ş", "Ğ", "Ç", "Ö", "Ü", "İ", "ş", "ğ", "ç", "ö", "ü", "ı",
];

const COUNT = 28;

/**
 * Fonda suzuvchi harflar. Avvalgi versiya har 50ms da React state yangilab
 * 30+ elementni qayta render qilardi. Endi pozitsiya/animatsiya bir marta
 * hisoblanadi va faqat CSS keyframes orqali harakatlanadi (JS interval yo'q).
 */
const LanguageBackground: React.FC = () => {
  const items = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 1 + 0.6,
        opacity: Math.random() * 0.12 + 0.05,
        duration: Math.random() * 20 + 25,
        delay: -Math.random() * 40,
        hue: Math.floor(Math.random() * 360),
      })),
    [],
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {items.map((it) => (
        <span
          key={it.id}
          className="lang-float absolute font-bold text-white select-none"
          style={{
            left: `${it.left}%`,
            top: `${it.top}%`,
            fontSize: `${it.size}rem`,
            opacity: it.opacity,
            animationDuration: `${it.duration}s`,
            animationDelay: `${it.delay}s`,
            textShadow: `0 0 6px hsl(${it.hue} 70% 55% / 0.6)`,
          }}
        >
          {it.char}
        </span>
      ))}
    </div>
  );
};

export default LanguageBackground;

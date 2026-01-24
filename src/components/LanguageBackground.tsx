"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const LanguageBackground: React.FC = () => {
  const [characters, setCharacters] = useState<{ id: number; char: string; x: number; y: number; size: number; opacity: number; blur: number; glow: string }[]>([]);

  useEffect(() => {
    const generateCharacters = () => {
      const chars = [
        'Aa', 'Bb', 'Cc', 'Dd', 'Ee', 'Ff', 'Gg', 'Hh', 'Ii', 'Jj', 'Kk', 'Ll', 'Mm',
        'Nn', 'Oo', 'Pp', 'Qq', 'Rr', 'Ss', 'Tt', 'Uu', 'Vv', 'Ww', 'Xx', 'Yy', 'Zz',
        'ع', 'ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط', 'ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', 'ذ', 'د', 'ج', 'ح', 'خ',
        'Ş', 'Ğ', 'Ç', 'Ö', 'Ü', 'Iı', 'İi', 'ş', 'ğ', 'ç', 'ö', 'ü', 'ı', 'i'
      ];

      const newChars = [];
      for (let i = 0; i < 50; i++) {
        newChars.push({
          id: i,
          char: chars[Math.floor(Math.random() * chars.length)],
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.1,
          blur: Math.random() * 2 + 1,
          glow: `hsl(${Math.random() * 360}, 70%, 50%)`
        });
      }
      setCharacters(newChars);
    };

    generateCharacters();

    const interval = setInterval(() => {
      setCharacters(prevChars =>
        prevChars.map(char => ({
          ...char,
          y: char.y + 0.5,
          x: char.x + (Math.random() - 0.5) * 0.2,
          opacity: Math.max(0.1, char.opacity - 0.005),
          blur: char.blur + 0.1
        })).filter(char => char.opacity > 0.1)
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {characters.map(char => (
        <motion.div
          key={char.id}
          initial={{ y: -100 }}
          animate={{
            x: `${char.x}%`,
            y: `${char.y}%`,
            opacity: char.opacity,
            filter: `blur(${char.blur}px) drop-shadow(0 0 ${char.blur * 2}px ${char.glow})`
          }}
          transition={{ type: 'spring', damping: 10, stiffness: 50 }}
          className="absolute text-4xl font-bold text-white"
          style={{
            fontSize: `${char.size}rem`,
            opacity: char.opacity,
            filter: `blur(${char.blur}px) drop-shadow(0 0 ${char.blur * 2}px ${char.glow})`
          }}
        >
          {char.char}
        </motion.div>
      ))}
    </div>
  );
};

export default LanguageBackground;
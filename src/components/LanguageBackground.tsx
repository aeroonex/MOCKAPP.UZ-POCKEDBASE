"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const LanguageBackground: React.FC = () => {
  const [characters, setCharacters] = useState<{ id: number; char: string; x: number; y: number; size: number; opacity: number; blur: number; glow: string }[]>([]);

  useEffect(() => {
    const chars = [
      'Aa', 'Bb', 'Cc', 'Dd', 'Ee', 'Ff', 'Gg', 'Hh', 'Ii', 'Jj', 'Kk', 'Ll', 'Mm',
      'Nn', 'Oo', 'Pp', 'Qq', 'Rr', 'Ss', 'Tt', 'Uu', 'Vv', 'Ww', 'Xx', 'Yy', 'Zz',
      'ع', 'ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط', 'ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', 'ذ', 'د', 'ج', 'ح', 'خ',
      'Ş', 'Ğ', 'Ç', 'Ö', 'Ü', 'Iı', 'İi', 'ş', 'ğ', 'ç', 'ö', 'ü', 'ı', 'i'
    ];

    const createNewCharacter = () => ({
      id: Date.now() + Math.random(), // Unique ID
      char: chars[Math.floor(Math.random() * chars.length)],
      x: Math.random() * 100, // Random X across screen
      y: Math.random() * 100, // Random Y across screen
      size: Math.random() * 2 + 1, // 1rem to 3rem
      opacity: Math.random() * 0.4 + 0.1, // 0.1 to 0.5 initial opacity
      blur: Math.random() * 1 + 0.5, // 0.5px to 1.5px initial blur
      glow: `hsl(${Math.random() * 360}, 70%, 50%)`
    });

    // Initial character generation
    const initialChars = [];
    for (let i = 0; i < 30; i++) {
      initialChars.push(createNewCharacter());
    }
    setCharacters(initialChars);

    // Interval to add new characters periodically
    const addCharacterInterval = setInterval(() => {
      setCharacters(prevChars => [...prevChars, createNewCharacter()]);
    }, 1000); // Add a new character every 1 second

    // Interval to update existing characters' positions, opacity, and blur
    const updateCharactersInterval = setInterval(() => {
      setCharacters(prevChars =>
        prevChars.map(char => ({
          ...char,
          y: char.y + 0.2, // Slower downward movement
          x: char.x + (Math.random() - 0.5) * 0.1, // Slower horizontal drift
          opacity: Math.max(0, char.opacity - 0.002), // Slower fade out
          blur: char.blur + 0.05 // Slower blur increase
        })).filter(char => char.opacity > 0.01 && char.y < 150) // Remove when almost invisible or far off-screen
      );
    }, 50); // Update every 50ms

    return () => {
      clearInterval(addCharacterInterval);
      clearInterval(updateCharactersInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {characters.map(char => (
        <motion.div
          key={char.id}
          initial={{ opacity: 0, scale: 0.8 }} // Initial entry animation: fade in and scale up
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }} // Quick entry transition
          className="absolute text-4xl font-bold text-white"
          style={{
            fontSize: `${char.size}rem`,
            top: `${char.y}%`, // Position directly from state
            left: `${char.x}%`, // Position directly from state
            opacity: char.opacity, // Opacity directly from state (will override animate after initial transition)
            filter: `blur(${char.blur}px) drop-shadow(0 0 ${char.blur * 2}px ${char.glow})` // Filter directly from state
          }}
        >
          {char.char}
        </motion.div>
      ))}
    </div>
  );
};

export default LanguageBackground;
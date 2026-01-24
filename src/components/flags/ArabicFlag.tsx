"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ArabicFlagProps {
  onClick: () => void;
  isActive: boolean;
}

const ArabicFlag: React.FC<ArabicFlagProps> = ({ onClick, isActive }) => {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className={cn(
        "flag-icon-container group",
        isActive && "flag-icon-active"
      )}
      aria-label={t("common.arabic")}
    >
      <svg viewBox="0 0 60 30" width="24" height="12" className="flag-icon">
        <rect width="60" height="30" fill="#007a3d" /> {/* Green background */}
        <circle cx="22.5" cy="15" r="7.5" fill="#fff" /> {/* White crescent outer */}
        <circle cx="24.375" cy="15" r="6" fill="#007a3d" /> {/* Green crescent inner */}
        <path d="M30,15 L33.75,16.18 L32.34,12.5 L36.09,11.32 L32.34,10.14 L33.75,6.46 L30,7.64 L26.25,6.46 L27.66,10.14 L23.91,11.32 L27.66,12.5 L26.25,16.18 Z" fill="#fff" transform="translate(11.25,0) scale(0.5)" /> {/* White star */}
      </svg>
    </button>
  );
};

export default ArabicFlag;
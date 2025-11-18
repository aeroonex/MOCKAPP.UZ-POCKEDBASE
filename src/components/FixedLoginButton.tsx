"use client";

import React from "react";
import { useTranslation } from 'react-i18next';

interface FixedLoginButtonProps {
  onOpenLogin: () => void;
}

const FixedLoginButton: React.FC<FixedLoginButtonProps> = ({ onOpenLogin }) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onOpenLogin}
      className="fixed-login-button fixed bottom-6 right-6 lg:bottom-10 lg:right-10 px-6 py-3 text-white text-md font-bold rounded-full focus:outline-none focus:ring-4 focus:ring-lime-500 focus:ring-opacity-50 z-40"
    >
      {t("common.login")}
    </button>
  );
};

export default FixedLoginButton;
"use client";

import React from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button"; // shadcn Button import qilindi
import { Map } from "lucide-react"; // Map ikonasi import qilindi

const MapViewButton: React.FC = () => {
  const { t } = useTranslation();

  const handleClick = () => {
    console.log("View on Map button clicked!");
    // Xaritani ko'rsatish logikasini bu yerga qo'shishingiz mumkin
    // navigate("/map");
  };

  return (
    <Button 
      variant="ghost" // Minimalistik ko'rinish
      size="sm" // Kichik o'lcham
      onClick={handleClick} 
      className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors px-2" // Qo'shimcha uslublar
    >
      <Map className="h-4 w-4" />
      <span className="hidden sm:inline">{t("common.view_on_map", "View on Map")}</span> {/* Katta ekranlarda matn ko'rinadi */}
    </Button>
  );
};

export default MapViewButton;
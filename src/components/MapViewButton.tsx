"use client";

import React from "react";
import { useTranslation } from 'react-i18next';

const MapViewButton: React.FC = () => {
  const { t } = useTranslation();

  const handleClick = () => {
    console.log("View on Map button clicked!");
    // Xaritani ko'rsatish logikasini bu yerga qo'shishingiz mumkin
    // navigate("/map");
  };

  return (
    <div className="map-view-button-wrapper" onClick={handleClick}>
      <div className="map-btn-original">
        <div className="pinpoint-original"></div>
        <div className="map-container-original"></div>
      </div>
      <span className="map-btn-text-original">{t("common.view_on_map", "View on Map")}</span>
    </div>
  );
};

export default MapViewButton;
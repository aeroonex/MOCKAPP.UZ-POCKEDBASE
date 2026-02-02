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
      {/* "View on Map" matni olib tashlandi */}
    </div>
  );
};

export default MapViewButton;
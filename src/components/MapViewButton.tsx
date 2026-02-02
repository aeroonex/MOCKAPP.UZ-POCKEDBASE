"use client";

import React from "react";
import { useTranslation } from 'react-i18next';
import "./MapViewButton.css"; // Import the custom CSS

const MapViewButton: React.FC = () => {
  const { t } = useTranslation();

  const handleClick = () => {
    // You can add your map viewing logic here
    console.log("View on Map button clicked!");
    // Example: navigate to a map page or open a modal
    // navigate("/map");
  };

  return (
    <div className="map-btn-wrapper" onClick={handleClick}>
      <svg height="0" width="0">
        <filter id="land">
          <feTurbulence
            result="turb"
            numOctaves="7"
            baseFrequency="0.006"
            type="fractalNoise"
          ></feTurbulence>
          <feDisplacementMap
            yChannelSelector="G"
            xChannelSelector="R"
            scale="700"
            in="SourceGraphic"
            in2="turb"
          ></feDisplacementMap>
        </filter>
      </svg>

      <div className="map-btn">{t("common.view_on_map", "View on Map")}</div>

      <div className="pinpoint"></div>
      <div className="map-container">
        <div className="map fold-1"></div>
        <div className="map fold-2"></div>
        <div className="map fold-3"></div>
        <div className="map fold-4"></div>
      </div>
    </div>
  );
};

export default MapViewButton;
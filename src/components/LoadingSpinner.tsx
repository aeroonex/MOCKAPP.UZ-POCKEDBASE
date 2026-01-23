"use client";

import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-background/80 backdrop-blur-sm">
      <div className="spinner">
          <div className="spinner1"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
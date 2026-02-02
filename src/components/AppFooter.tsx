"use client";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from "react-router-dom";
import MapViewButton from './MapViewButton';

const AppFooter: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  // Tarmoq holati va vaqt bilan bog'liq state va effektlar endi kerak emas, shuning uchun olib tashlandi.
  // const [isOnline, setIsOnline] = useState(navigator.onLine);
  // const [ping, setPing] = useState<number | null>(null);
  // const [speed, setSpeed] = useState<number | null>(null);
  // const [time, setTime] = useState<string>('');

  // useEffect(() => {
  //   const handleOnline = () => setIsOnline(true);
  //   const handleOffline = () => setIsOnline(false);

  //   window.addEventListener('online', handleOnline);
  //   window.addEventListener('offline', handleOffline);

  //   return () => {
  //     window.removeEventListener('online', handleOnline);
  //     window.removeEventListener('offline', handleOffline);
  //   };
  // }, []);

  // useEffect(() => {
  //   const connection = (navigator as any).connection;
  //   if (!connection) return;

  //   const updateNetworkInfo = () => {
  //     setPing(connection.rtt);
  //     if (connection.downlink) {
  //       setSpeed(connection.downlink / 8);
  //     }
  //   };

  //   updateNetworkInfo();
  //   connection.addEventListener('change', updateNetworkInfo);

  //   return () => {
  //     connection.removeEventListener('change', updateNetworkInfo);
  //   };
  // }, []);

  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     const tashkentTime = new Date().toLocaleTimeString('en-GB', {
  //       timeZone: 'Asia/Tashkent',
  //       hour: '2-digit',
  //       minute: '2-digit',
  //       second: '2-digit',
  //     });
  //     setTime(tashkentTime);
  //   }, 1000);

  //   return () => {
  //     clearInterval(timer);
  //   };
  // }, []);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border py-2 text-foreground shadow-lg">
      <div className="container mx-auto px-4 flex justify-center text-xs"> {/* Layoutni markazga joylashtirish uchun o'zgartirildi */}
        {/* Faqat MapViewButton qoldi */}
        <div className="flex items-center">
          <MapViewButton />
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
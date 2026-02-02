"use client";

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, Signal, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

const NetworkStatusFooter: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [ping, setPing] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [time, setTime] = useState<string>('');
  const { t } = useTranslation();
  const isMobile = useIsMobile(); // Use the hook

  if (isMobile) { // Hide on mobile
    return null;
  }

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const connection = (navigator as any).connection;
    if (!connection) return;

    const updateNetworkInfo = () => {
      setPing(connection.rtt);
      if (connection.downlink) {
        setSpeed(connection.downlink / 8);
      }
    };

    updateNetworkInfo();
    connection.addEventListener('change', updateNetworkInfo);

    return () => {
      connection.removeEventListener('change', updateNetworkInfo);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const tashkentTime = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Tashkent',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setTime(tashkentTime);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-secondary text-secondary-foreground p-2 shadow-t-lg flex items-center justify-around z-50 border-t">
      <div className="footer-button-container">
        <div className="footer-button-inner">
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span className={isOnline ? 'footer-status-online' : 'footer-status-offline'}>
            {isOnline ? t("common.online") : t("common.offline")}
          </span>
        </div>
      </div>

      {isOnline && typeof ping === 'number' && (
        <div className="footer-button-container hidden sm:flex">
          <div className="footer-button-inner">
            <Signal size={14} />
            <span>Ping: {ping} ms</span>
          </div>
        </div>
      )}

      {isOnline && typeof speed === 'number' && (
        <div className="footer-button-container hidden sm:flex">
          <div className="footer-button-inner">
            <ArrowDownCircle size={14} />
            <span>{speed.toFixed(2)} MB/s</span>
          </div>
        </div>
      )}

      <div className="footer-button-container">
        <div className="footer-button-inner">
          <Clock size={14} />
          <span>{t("common.tashkent")}: {time}</span>
        </div>
      </div>
    </footer>
  );
};

export default NetworkStatusFooter;
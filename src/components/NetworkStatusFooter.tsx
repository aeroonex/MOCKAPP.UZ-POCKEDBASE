"use client";

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, Signal, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const NetworkStatusFooter: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [ping, setPing] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [time, setTime] = useState<string>('');
  const { t } = useTranslation();

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
    <footer className="fixed bottom-0 left-0 w-full bg-secondary text-secondary-foreground p-2 shadow-t-lg flex items-center justify-around text-xs z-50 border-t">
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-1 font-semibold border-r border-secondary-foreground/20',
          isOnline ? 'text-green-600' : 'text-destructive',
        )}
      >
        {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
        <span>{isOnline ? t("common.online") : t("common.offline")}</span>
      </div>

      {isOnline && typeof ping === 'number' && (
        <div className="hidden sm:flex items-center gap-2 px-4 py-1 text-muted-foreground border-r border-secondary-foreground/20">
          <Signal size={14} />
          <span>Ping: {ping} ms</span>
        </div>
      )}

      {isOnline && typeof speed === 'number' && (
        <div className="hidden sm:flex items-center gap-2 px-4 py-1 text-muted-foreground border-r border-secondary-foreground/20">
          <ArrowDownCircle size={14} />
          <span>{speed.toFixed(2)} MB/s</span>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-1 text-muted-foreground">
        <Clock size={14} />
        <span>{t("common.tashkent")}: {time}</span>
      </div>
    </footer>
  );
};

export default NetworkStatusFooter;
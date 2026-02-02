"use client";
import React, { useState, useEffect } from 'react';
import { Server, Lock, Wifi, WifiOff, Clock, Signal, ArrowDownCircle } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useLocation } from "react-router-dom";
import { cn } from '@/lib/utils';
import MapViewButton from './MapViewButton'; // MapViewButton import qilindi

const AppFooter: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [ping, setPing] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [time, setTime] = useState<string>('');

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
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border py-2 text-foreground shadow-lg">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs">
        {/* Left Section: Brand, Slogan, and MapViewButton */}
        <div className="flex flex-col items-center sm:items-start mb-2 sm:mb-0">
          <h3 className="text-base font-bold">Edumock.uz</h3>
          <p className="text-xs text-muted-foreground max-w-xs text-center sm:text-left mb-1">
            {t("landing_page.slogan_short", "Your platform for conversational practice and real results.")}
          </p>
          <MapViewButton /> {/* MapViewButton bu yerga joylashtirildi */}
        </div>

        {/* Middle Section: Network Status and Time */}
        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1 mb-2 sm:mb-0">
          <div className="flex items-center gap-1">
            {isOnline ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-destructive" />}
            <span className={cn(isOnline ? 'text-green-500' : 'text-destructive', 'font-medium')}>
              {isOnline ? t("common.online") : t("common.offline")}
            </span>
          </div>

          {isOnline && typeof ping === 'number' && (
            <div className="flex items-center gap-1">
              <Signal size={14} />
              <span>Ping: {ping} ms</span>
            </div>
          )}

          {isOnline && typeof speed === 'number' && (
            <div className="flex items-center gap-1">
              <ArrowDownCircle size={14} />
              <span>{speed.toFixed(2)} MB/s</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{t("common.tashkent")}: {time}</span>
          </div>
        </div>

        {/* Right Section: Policies and Copyright */}
        <div className="flex flex-col items-center sm:items-end">
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs mb-1">
            <a href="#" className="text-muted-foreground hover:text-primary transition">
              {t("landing_page.privacy_policy")}
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition">
              {t("landing_page.terms_of_use")}
            </a>
          </nav>
          <p className="text-muted-foreground text-xs font-medium">
            &copy; {new Date().getFullYear()} Edumock.uz, Inc. {t("landing_page.all_rights_reserved")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
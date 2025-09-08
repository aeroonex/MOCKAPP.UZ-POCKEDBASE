"use client";

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, Signal, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const NetworkStatusFooter: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [ping, setPing] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null); // MB/s da
  const [time, setTime] = useState<string>('');

  // Internet holatini tekshirish uchun
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

  // Tarmoq ma'lumotlarini (ping va tezlik) olish uchun
  useEffect(() => {
    const connection = (navigator as any).connection;
    if (!connection) return;

    const updateNetworkInfo = () => {
      setPing(connection.rtt);
      // `downlink` Mbps (megabit per second) da keladi. MB/s (megabyte per second) ga o'tkazamiz (1 byte = 8 bit).
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

  // Toshkent vaqtini har soniyada yangilash uchun
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
          'flex items-center gap-2 p-1 rounded-md font-semibold',
          isOnline ? 'text-green-600' : 'text-red-600',
        )}
      >
        {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {isOnline && typeof ping === 'number' && (
        <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
          <Signal size={14} />
          <span>Ping: {ping} ms</span>
        </div>
      )}

      {isOnline && typeof speed === 'number' && (
        <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
          <ArrowDownCircle size={14} />
          <span>{speed.toFixed(2)} MB/s</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock size={14} />
        <span>Tashkent: {time}</span>
      </div>
    </footer>
  );
};

export default NetworkStatusFooter;
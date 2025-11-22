"use client";

import React from 'react';

// Yuklash/Yuklab olish jarayonining holatini saqlash uchun Map
const progressMap = new Map<string, number>(); // Key: recordingId, Value: progressPercentage (0-100)

// Holat o'zgarishlarini tinglovchilar
const listeners = new Set<() => void>();

/**
 * Jarayonning foizini yangilaydi va tinglovchilarni xabardor qiladi.
 * @param id Yozuvning IDsi
 * @param progress Foiz (0-100)
 */
export const setProgress = (id: string, progress: number) => {
  progressMap.set(id, progress);
  listeners.forEach(listener => listener());
};

/**
 * Jarayonning holatini o'chiradi.
 * @param id Yozuvning IDsi
 */
export const removeProgress = (id: string) => {
  progressMap.delete(id);
  listeners.forEach(listener => listener());
};

/**
 * Yuklash/Yuklab olish jarayonining holatini kuzatish uchun React hook.
 * @returns Map<string, number> holatlar
 */
export const useProgress = () => {
  const [progressState, setProgressState] = React.useState(progressMap);

  React.useEffect(() => {
    const handler = () => setProgressState(new Map(progressMap));
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return progressState;
};

// Eski nomlarni yangi nomlarga moslashtirish (orqaga moslik uchun)
export const setUploadProgress = setProgress;
export const removeUploadProgress = removeProgress;
export const useUploadProgress = useProgress;
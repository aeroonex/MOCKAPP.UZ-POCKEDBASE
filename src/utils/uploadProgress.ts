"use client";

import React from 'react';

// Yuklash jarayonining holatini saqlash uchun Map
const uploadProgressMap = new Map<string, number>(); // Key: recordingId, Value: progressPercentage (0-100)

// Holat o'zgarishlarini tinglovchilar
const listeners = new Set<() => void>();

/**
 * Yuklash jarayonining foizini yangilaydi va tinglovchilarni xabardor qiladi.
 * @param id Yozuvning IDsi
 * @param progress Yuklash foizi (0-100)
 */
export const setUploadProgress = (id: string, progress: number) => {
  uploadProgressMap.set(id, progress);
  listeners.forEach(listener => listener());
};

/**
 * Yuklash jarayonining holatini o'chiradi.
 * @param id Yozuvning IDsi
 */
export const removeUploadProgress = (id: string) => {
  uploadProgressMap.delete(id);
  listeners.forEach(listener => listener());
};

/**
 * Yuklash jarayonining holatini kuzatish uchun React hook.
 * @returns Map<string, number> yuklash holatlari
 */
export const useUploadProgress = () => {
  const [progressState, setProgressState] = React.useState(uploadProgressMap);

  React.useEffect(() => {
    const handler = () => setProgressState(new Map(uploadProgressMap));
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return progressState;
};
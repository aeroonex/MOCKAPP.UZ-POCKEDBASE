"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";

interface Anchor {
  id: string;
  y: number; // konteynerga nisbatan
  top: number;
  bottom: number;
  dark?: boolean; // to'q fonli bo'lim
}

// Keng ekran (>=1400px): chap bo'sh joyda keng S-egri; torroq (>=1024px): chekkada ixcham chiziq.
const WIDE = { xl: 22, xr: 74, w: 96 };
const COMPACT = { xl: 8, xr: 20, w: 32 };

/** Bo'limlar orasidagi yumshoq S-egri chiziq (SVG path). */
const buildPath = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const c = (p1.y - p0.y) * 0.5;
    d += ` C ${p0.x} ${p0.y + c}, ${p1.x} ${p1.y - c}, ${p1.x} ${p1.y}`;
  }
  return d;
};

const Dot: React.FC<{ y: number; x: number; at: number; progress: MotionValue<number>; label?: string; dark?: boolean; size?: number }> = ({ y, x, at, progress, label, dark, size = 20 }) => {
  const scale = useTransform(progress, [at - 0.03, at], [0.4, 1]);
  const opacity = useTransform(progress, [at - 0.03, at], [0.25, 1]);
  const ring = useTransform(progress, [at - 0.03, at, at + 0.06], [0, 1, 0]);
  return (
    <div className="absolute" style={{ left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      <motion.span style={{ scale, opacity }} className={dark ? "block h-full w-full rounded-full border-[3px] border-[#0f172a] bg-white shadow-[0_6px_16px_-6px_rgba(255,255,255,0.6)]" : "block h-full w-full rounded-full border-[3px] border-white bg-[var(--l-blue)] shadow-[0_6px_16px_-6px_rgba(37,99,235,0.8)]"} />
      <motion.span style={{ opacity: ring, scale: useTransform(ring, [0, 1], [1, 2.2]) }} className="absolute inset-0 rounded-full border-2 border-[var(--l-lime)]" />
      {label && (
        <motion.span style={{ opacity }} className={dark ? "absolute left-7 top-0.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-sky-300" : "absolute left-7 top-0.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--l-blue)]"}>
          {label}
        </motion.span>
      )}
    </div>
  );
};

/**
 * Sahifa bo'ylab scroll bilan "chiziladigan" yo'l. Bo'limlarning haqiqiy joylashuvi o'lchanadi,
 * nuqtalar shu bo'limlarga yetganda yonadi. Faqat keng ekranlarda (chap bo'sh joyda).
 */
const ScrollPath: React.FC<{ sectionIds: string[]; labels?: Record<string, string> }> = ({ sectionIds, labels }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [height, setHeight] = useState(0);
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.innerWidth < 1400);

  useEffect(() => {
    const measure = () => {
      const host = ref.current?.parentElement;
      if (!host) return;
      const hostTop = host.getBoundingClientRect().top + window.scrollY;
      const list: Anchor[] = [];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY - hostTop;
        const bottom = top + el.offsetHeight;
        const dark = getComputedStyle(el).backgroundColor === "rgb(15, 23, 42)";
        list.push({ id, y: top + 120, top, bottom, dark });
      }
      setAnchors(list);
      setHeight(host.offsetHeight);
      setCompact(window.innerWidth < 1400);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current?.parentElement) ro.observe(ref.current.parentElement);
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 800); // shriftlar/rasm yuklangandan keyin
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, [sectionIds]);

  const geo = compact ? COMPACT : WIDE;
  const points = useMemo(() => {
    const pts = [{ x: geo.xl, y: 0 }];
    anchors.forEach((a, i) => pts.push({ x: i % 2 === 0 ? geo.xr : geo.xl, y: a.y }));
    if (height) pts.push({ x: anchors.length % 2 === 0 ? geo.xr : geo.xl, y: height - 80 });
    return pts;
  }, [anchors, height, geo]);

  const d = useMemo(() => buildPath(points), [points]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 55%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });
  const staticProgress = useSpring(1, { stiffness: 1000, damping: 100 });
  const effective = reduce ? staticProgress : progress;

  if (!height) return <div ref={ref} className="pointer-events-none absolute inset-y-0 left-0 hidden w-24 lg:block" aria-hidden="true" />;

  // To'q bo'limlar ichida chiziq oq/havorang, tashqarida ko'k → lime.
  const darkRanges = anchors.filter((a) => a.dark).map((a) => [a.top, a.bottom] as const);
  const pct = (y: number) => Math.min(1, Math.max(0, y / Math.max(1, height)));
  const stops: { o: number; c: string }[] = [{ o: 0, c: "#2563eb" }];
  const trackStops: { o: number; c: string }[] = [{ o: 0, c: "rgba(15,23,42,0.12)" }];
  darkRanges.forEach(([top, bottom]) => {
    stops.push({ o: pct(top - 40), c: "#38bdf8" }, { o: pct(top + 24), c: "#ffffff" }, { o: pct(bottom - 24), c: "#ffffff" }, { o: pct(bottom + 40), c: "#38bdf8" });
    trackStops.push({ o: pct(top - 1), c: "rgba(15,23,42,0.12)" }, { o: pct(top), c: "rgba(255,255,255,0.16)" }, { o: pct(bottom), c: "rgba(255,255,255,0.16)" }, { o: pct(bottom + 1), c: "rgba(15,23,42,0.12)" });
  });
  stops.push({ o: 1, c: "#bef264" });
  trackStops.push({ o: 1, c: "rgba(15,23,42,0.12)" });

  return (
    <div ref={ref} className="pointer-events-none absolute inset-y-0 z-10 hidden lg:block" style={{ left: compact ? 0 : 8, width: geo.w }} aria-hidden="true">
      <svg width={geo.w} height={height} viewBox={`0 0 ${geo.w} ${height}`} className="absolute inset-0 overflow-visible">
        <defs>
          <linearGradient id="scroll-path-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={height}>
            {stops.map((st, i) => <stop key={i} offset={st.o} stopColor={st.c} />)}
          </linearGradient>
          <linearGradient id="scroll-track-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={height}>
            {trackStops.map((st, i) => <stop key={i} offset={st.o} stopColor={st.c} />)}
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="url(#scroll-track-grad)" strokeWidth="2" />
        <motion.path d={d} fill="none" stroke="url(#scroll-path-grad)" strokeWidth="3" strokeLinecap="round" style={{ pathLength: effective }} />
      </svg>
      {anchors.map((a, i) => (
        <Dot
          key={a.id}
          x={i % 2 === 0 ? geo.xr : geo.xl}
          y={a.y}
          size={compact ? 14 : 20}
          at={Math.min(0.98, a.y / Math.max(1, height - 80))}
          progress={effective}
          label={labels?.[a.id]}
          dark={a.dark}
        />
      ))}
    </div>
  );
};

export default ScrollPath;
